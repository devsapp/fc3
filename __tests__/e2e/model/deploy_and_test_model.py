#!/usr/bin/env python3
"""
模型部署和测试脚本
"""

import hashlib
import json
import os
import subprocess
import urllib.parse
import secrets
import string

import requests
import yaml


# 生成随机token
def generate_random_token(length=30):
    """生成指定长度的随机token"""
    characters = string.ascii_letters + string.digits
    return "sk-" + "".join(secrets.choice(characters) for _ in range(length))


token = generate_random_token()


def simple_hash(input_string: str) -> str:
    """
    生成固定长度16的字符串哈希值

    参数:
        input_string: 要哈希的字符串

    返回:
        16个字符的十六进制哈希字符串
    """
    # 使用SHA-256算法生成哈希
    sha256_hash = hashlib.sha256(input_string.encode("utf-8")).hexdigest()

    # 取前8字符和后8字符组合成16字符
    return sha256_hash[:8] + sha256_hash[-8:]


def deploy_model(model_id: str, region: str = "cn-hangzhou", storage: str = "nas"):
    """
    部署模型到函数计算

    Args:
        model_id: 模型ID
        region: 部署区域

    Returns:
        tuple: (部署的URL, 配置文件路径)
    """
    # 生成函数名称
    # 加个随机数
    function_name = f"test-{simple_hash(model_id)}-{secrets.token_hex(4)}"

    # 准备请求数据
    deploy_data = {
        "functionName": function_name,
        "region": region,
        "authType": "bearer",
        "tokenData": token,
    }

    # 打印生成的token
    print(f"生成的随机token: {token}")

    # URL编码模型ID
    encoded_model_id = urllib.parse.quote(model_id, safe="")

    # 调用部署接口
    model_registry_url = os.getenv("MODEL_REGISTRY_URL", "model-registry.devsapp.cn")
    deploy_url = (
        f"http://{model_registry_url}/api/v1/models/{encoded_model_id}/deploy-info"
    )
    print(f"deploy url: {deploy_url}")
    print(f"正在部署模型: {model_id}")
    print(f"请求URL: {deploy_url}")
    print(f"请求数据: {json.dumps(deploy_data, indent=2)}")

    response = requests.post(
        deploy_url,
        headers={"accept": "application/json", "Content-Type": "application/json"},
        data=json.dumps(deploy_data),
    )

    if response.status_code != 200:
        raise Exception(f"部署请求失败: {response.status_code} - {response.text}")

    result = response.json()
    print(f"部署响应: {json.dumps(result, indent=2)}")

    # 检查响应是否成功
    if not result.get("success", False):
        raise Exception(f"部署失败: {result.get('error', 'Unknown error')}")

    # 提取部署信息
    deploy_info = result.get("data", {})

    # 使用当前文件夹下的s.yaml内容作为基础配置
    with open("s.yaml", "r", encoding="utf-8") as f:
        s_yaml = yaml.safe_load(f)

    # 更新resources中的props
    s_yaml["resources"]["test_func"]["props"] = deploy_info

    # 下载到 oss
    if storage == "oss":
        s_yaml["resources"]["test_func"]["props"].pop("nasConfig", None)
        s_yaml["resources"]["test_func"]["props"].pop("vpcConfig", None)
        s_yaml["resources"]["test_func"]["props"]["ossMountConfig"] = "auto"
        s_yaml["resources"]["test_func"]["props"][
            "role"
        ] = "acs:ram::${config('AccountID')}:role/aliyunfcdefaultrole"
        s_yaml["resources"]["test_func"]["props"]["annotations"]["modelConfig"][
            "storage"
        ] = storage
        # 修改 customContainerConfig.entrypoint 中的路径
        custom_container_config = s_yaml["resources"]["test_func"]["props"].get("customContainerConfig", {})
        if "entrypoint" in custom_container_config:
            entrypoint = custom_container_config["entrypoint"]
            if isinstance(entrypoint, list):
                # 遍历 entrypoint 数组，替换包含 /mnt/ 的路径
                for i, item in enumerate(entrypoint):
                    if isinstance(item, str) and "/mnt/" in item and not item.startswith("vllm") and not item.isdigit() and item not in ["--port", "--served-model-name", "--trust-remote-code"]:
                        entrypoint[i] = f"/mnt/serverless-{region}-d70a9a8a-c817-5ed1-a293-4be0908f0a5"
            custom_container_config["entrypoint"] = entrypoint

    # 保存配置到临时文件
    s_yaml_file = f"s.yaml"
    with open(s_yaml_file, "w", encoding="utf-8") as f:
        yaml.dump(s_yaml, f, default_flow_style=False, allow_unicode=True)

    print(f"使用配置文件部署: {s_yaml_file}")

    # 执行部署命令
    try:
        # 下载模型
        print("正在下载模型...")
        subprocess.check_call(f"s model download -y -t {s_yaml_file}", shell=True)

        # 部署函数
        print("正在部署函数...")
        subprocess.check_call(f"s deploy -y -t {s_yaml_file} --skip-push", shell=True)

        # 获取部署信息
        print("正在获取部署信息...")
        result = subprocess.check_output(
            f"s info -t {s_yaml_file} --silent -o json",
            shell=True,
        ).strip()

        result_dict = json.loads(result)
        deploy_url = result_dict["url"]["system_url"]
        print(f"部署成功，访问URL: {deploy_url}")

        return deploy_url, s_yaml_file

    except subprocess.CalledProcessError as e:
        raise Exception(f"部署过程失败: {e}")
    except Exception as e:
        raise Exception(f"获取部署信息失败: {e}")


def test_model(model_id: str, deploy_url: str, s_yaml_file: str = None):
    """
    测试已部署的模型

    Args:
        model_id: 模型ID
        deploy_url: 部署的URL
        s_yaml_file: Serverless Devs 配置文件路径，用于检查启动命令
    """
    # 先调用模型详情接口
    model_detail_url = f"{deploy_url}/model/info"
    print(f"正在获取部署后的模型服务详情: {model_detail_url}")

    # 检查是否是vLLM模型（通过配置文件中的启动命令）
    is_vllm_model = False
    if s_yaml_file:
        try:
            with open(s_yaml_file, "r", encoding="utf-8") as f:
                s_config = yaml.safe_load(f)
                # 检查启动命令中是否包含vllm
                props = (
                    s_config.get("resources", {}).get("test_func", {}).get("props", {})
                )
                custom_container_config = props.get("customContainerConfig", {})
                # 检查entrypoint数组中是否包含vllm
                entrypoint = custom_container_config.get("entrypoint", [])
                if isinstance(entrypoint, list):
                    entrypoint_str = " ".join(entrypoint)
                else:
                    entrypoint_str = str(entrypoint)
                # 检查command字段（为了兼容性）
                command = custom_container_config.get("command", "")
                if "vllm" in entrypoint_str or "vllm" in command:
                    is_vllm_model = True
                    print("检测到vLLM模型，将使用专用测试方法")
        except Exception as e:
            print(f"检查模型类型时出错: {e}")
    
    # 先调用模型详情接口
    model_detail_url = f"{deploy_url}/model/info"
    if is_vllm_model:
        model_detail_url = f"{deploy_url}/v1/models"
    print(f"正在获取部署后的模型服务详情: {model_detail_url}")
    try:
        detail_response = requests.get(
            model_detail_url, headers={"Authorization": f"Bearer {token}"}
        )
        if detail_response.status_code == 200:
            print(f"部署后的模型服务详情: {detail_response.text}")
        else:
            print(f"获取部署后的模型服务详情失败: {detail_response.status_code}")
    except Exception as e:
        print(f"获取部署后的模型服务详情时出错: {e}")

    if is_vllm_model:
        # 对于vLLM模型，使用专门的测试方法
        print(f"正在测试vLLM模型: {deploy_url}")
        test_vllm_model(deploy_url)
        return True
    else:
        # 获取模型信息
        encoded_model_id = urllib.parse.quote(model_id, safe="")
        model_registry_url = os.getenv(
            "MODEL_REGISTRY_URL", "model-registry-dayly.devsapp.cn"
        )
        model_info_url = f"http://{model_registry_url}/api/v1/models/{encoded_model_id}"

        print(f"正在获取模型信息: {model_info_url}")

        response = requests.get(
            model_info_url,
            headers={"accept": "application/json"},
        )

        if response.status_code != 200:
            raise Exception(
                f"获取模型信息失败: {response.status_code} - {response.text}"
            )

        model_info = response.json()

        if not model_info.get("success", False):
            raise Exception(
                f"获取模型信息失败: {model_info.get('error', 'Unknown error')}"
            )

        model_data = model_info.get("data", {})
        tasks = model_data.get("tasks", [])

        if not tasks:
            raise Exception("模型没有定义任务类型")

        task_name = tasks[0].get("name", "")
        print(f"模型任务类型: {task_name}")

        # 获取测试payload
        payload_url = "https://images.devsapp.cn/modelscope/pipeline_inputs.json"
        print(f"正在获取测试payload: {payload_url}")

        payload_response = requests.get(payload_url)
        if payload_response.status_code != 200:
            raise Exception(f"获取测试payload失败: {payload_response.status_code}")

        # 解析payload数据
        try:
            payload_templates = payload_response.json()
            payload = payload_templates.get(task_name, {})
        except json.JSONDecodeError:
            # 如果不是JSON格式，尝试使用文本
            payload = {"input": payload_response.text}

        print(f"测试payload: {json.dumps(payload, indent=2)}")

        # 发送测试请求
        print(f"正在测试部署的模型: {deploy_url}")

        test_response = requests.post(
            deploy_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            data=json.dumps(payload),
        )

        print(f"测试响应状态码: {test_response.status_code}")
        print(f"测试响应内容: {test_response.text}")

        if test_response.status_code == 200:
            print("模型测试成功!")
            return True
        else:
            print("模型测试失败!")
            return False


def test_vllm_model(deploy_url: str):
    """
    测试vLLM模型

    Args:
        deploy_url: 部署的URL
    """
    # 对于vLLM模型，使用专门的测试方法
    chat_url = f"{deploy_url}/v1/chat/completions"
    print(f"正在测试vLLM模型: {chat_url}")

    test_data = {
        "messages": [{"role": "user", "content": "Hello! 你是谁？"}],
        "stream": False,
    }

    try:
        response = requests.post(
            chat_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            data=json.dumps(test_data),
            timeout=300,  # 5分钟超时
        )

        print(f"vLLM测试响应状态码: {response.status_code}")
        print(f"vLLM测试响应内容: {response.text}")

        if response.status_code == 200:
            print("vLLM模型测试成功!")
            return True
        else:
            print("vLLM模型测试失败!")
            return False
    except Exception as e:
        print(f"测试vLLM模型时出错: {e}")
        return False


def cleanup_deployment(s_yaml_file: str):
    """
    清除部署的资源

    Args:
        s_yaml_file: Serverless Devs 配置文件路径
    """
    try:
        print(f"正在清除部署资源: {s_yaml_file}")
        # 清除模型
        subprocess.check_call(f"s model remove -y -t {s_yaml_file}", shell=True)
        # 清除函数
        subprocess.check_call(f"s remove -y -t {s_yaml_file} --skip-push", shell=True)
        print("部署资源清除完成!")
    except subprocess.CalledProcessError as e:
        print(f"清除部署资源失败: {e}")
    except Exception as e:
        print(f"清除部署资源时发生错误: {e}")


def main():
    """
    主函数
    """
    import argparse

    parser = argparse.ArgumentParser(description="模型部署和测试脚本")
    parser.add_argument("--model-id", help="模型ID")
    parser.add_argument("--region", default="cn-shanghai", help="部署区域")
    parser.add_argument("--cleanup", help="执行清除操作，提供配置文件路径")
    parser.add_argument(
        "--auto-cleanup", action="store_true", help="部署和测试完成后自动执行清理操作"
    )
    parser.add_argument("--storage", help="存储区域", default="nas")

    args = parser.parse_args()

    try:
        if args.cleanup:
            # 只执行清除操作
            cleanup_deployment(args.cleanup)
            return 0
        elif args.model_id:
            # 部署和测试模型
            deploy_url, s_yaml_file = deploy_model(
                args.model_id, args.region, args.storage
            )

            # 测试模型
            test_model(args.model_id, deploy_url, s_yaml_file)

            if args.auto_cleanup:
                # 自动执行清理操作
                print("自动执行清理操作...")
                cleanup_deployment(s_yaml_file)
                print("模型部署、测试和清理完成!")
            else:
                print(f"模型部署和测试完成! 配置文件路径: {s_yaml_file}")
                print(
                    "如需清除资源，请运行: python deploy_and_test_model.py --cleanup {}".format(
                        s_yaml_file
                    )
                )
        else:
            print("请提供模型ID或使用 --cleanup 参数指定配置文件路径")
            return 1

    except Exception as e:
        print(f"错误: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
