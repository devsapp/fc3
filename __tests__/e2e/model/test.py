#!/usr/bin/env python3
import os
import subprocess
import time
import sys

def run_command_with_retry(cmd, silent=False, max_retries=3, timeout=300):
    """执行命令并返回结果，支持重试"""
    for i in range(max_retries):
        if not silent:
            print(f"执行命令: {cmd} (尝试 {i+1}/{max_retries})")
        
        try:
            output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True, timeout=timeout)
            return 0, output, ""
        except subprocess.TimeoutExpired:
            print(f"命令超时: {cmd}")
            if i == max_retries - 1:
                return -1, "", "Command timed out after retries"
        except Exception as e:
            print(f"命令执行出错: {str(e)}")
            if i == max_retries - 1:
                return -1, "", str(e)
    
    return -1, "", "Failed after retries"

def main():
    # 获取函数名（与YAML中一致）
    fc_component_function_name = os.environ.get('fc_component_function_name', 'nodejs18')
    function_name = f"fc3-model-files-{fc_component_function_name}"
    
    print("开始执行模型部署和实例检查流程...")
    print(f"函数名: {function_name}")
    
    # 1. 执行模型下载
    print("1. 执行模型下载: s model download -t s_file.yaml")
    subprocess.check_output(f"s model download -t s_file.yaml",shell=True)
    
    # 2. 部署模型
    print("2. 执行部署: s deploy -y -t s_file.yaml")
    subprocess.check_output(f"s deploy -y -t s_file.yaml --skip-push",shell=True)
    
    # 3. 调用函数确保实例启动
    print("3. 调用函数确保实例启动: s invoke -t s_file.yaml")
    subprocess.check_output(f"s invoke -t s_file.yaml",shell=True)
    
    # 4. 等待实例启动
    print("4. 等待实例启动...")
    time.sleep(10)
    
    # 5. 获取实例列表并提取instanceId
    print("5. 获取实例列表: s instance list -t s_file.yaml")
    ret_code, instance_output, stderr = run_command_with_retry("s instance list -t s_file.yaml")
    
    if ret_code == 0:
        print("实例列表:")
        print(instance_output)
        
        # 提取第一个instanceId
        instance_id = None
        for line in instance_output.split('\n'):
            if 'instanceId:' in line:
                instance_id = line.split('instanceId:')[1].strip()
                break
        
        if instance_id:
            print(f"提取到的instanceId: {instance_id}")
            
            # 6. 执行详细检查
            cmd = f"s instance exec --instance-id {instance_id} --cmd 'ls /mnt/{function_name}/models/checkpoints/v1-5-pruned-emaonly-fp16.safetensors'"
            print(f"6. 执行详细检查: {cmd}")
            ret_code, find_output, stderr = run_command_with_retry(cmd)
            print(f"文件查找结果: {find_output}, 错误信息: {stderr}, 状态码: {ret_code}")
            
            if ret_code == 0:
                print("文件查找结果:")
                print(find_output)
                
                if "v1-5-pruned-emaonly-fp16.safetensors" in find_output:
                    print("✓ 文件存在路径确认")
                else:
                    print("✗ 文件未在/mnt/auto目录下找到")
                    # 文件不存在，终止流程
                    sys.exit(1)
            else:
                print("文件查找命令执行失败:")
                print(find_output)
                print(f"错误信息: {stderr}")
                # 命令执行失败，终止流程
                sys.exit(1)
        else:
            print("✗ 未找到instanceId")
    else:
        print("✗ 获取实例列表失败:")
        print(instance_output)
        print(f"错误信息: {stderr}")
    
    # 7. 执行模型移除
    print("7. 执行模型移除: s model remove -t s_file.yaml")
    subprocess.check_output(f"s model remove -t s_file.yaml", shell=True)
    
    # 8. 移除部署
    print("8. 移除部署: s remove -y -t s_file.yaml")
    subprocess.check_output(f"s remove -y -t s_file.yaml", shell=True)
    
    print("测试流程完成")

if __name__ == "__main__":
    main()