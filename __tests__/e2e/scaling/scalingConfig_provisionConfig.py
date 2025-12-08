#!/usr/bin/env python3
""" 
Test the conversion between scalingConfig and provisionConfig, as well as the conversion between GPUs of the same type and different types.
"""
import subprocess

import yaml

s_yaml_file = f"s_149.yaml"


def deploy_function(scalingConfig, provisionConfig, gpuConfig=None, memorySize=None):
    """
    部署函数
    根据 scalingConfig 或 provisionConfig 创建函数
    """
    print(f"scalingConfig: {scalingConfig} provisionConfig: {provisionConfig}")
    # 使用当前文件夹下的s.yaml内容作为基础配置
    with open("s_149.yaml", "r", encoding="utf-8") as f:
        s_yaml = yaml.safe_load(f)

    s_yaml["resources"]["fcDemo"]["props"]["scalingConfig"] = scalingConfig
    if provisionConfig is not None:
        s_yaml["resources"]["fcDemo"]["props"]["provisionConfig"] = provisionConfig
    elif "provisionConfig" in s_yaml["resources"]["fcDemo"]["props"]:
        del s_yaml["resources"]["fcDemo"]["props"]["provisionConfig"]
        
    if gpuConfig is not None:
        s_yaml["resources"]["fcDemo"]["props"]["gpuConfig"] = gpuConfig

    if memorySize is not None:
        s_yaml["resources"]["fcDemo"]["props"]["memorySize"] = memorySize

    with open(s_yaml_file, "w", encoding="utf-8") as f:
        yaml.dump(s_yaml, f, default_flow_style=False, allow_unicode=True)

    print(f"使用配置文件部署: {s_yaml_file}")

    # 执行部署命令
    print("正在部署...")
    subprocess.check_call(f"s deploy -y -t {s_yaml_file} --skip-push", shell=True)


def cleanup_deployment():
    """
    清理部署
    """
    print(f"正在清理部署: {s_yaml_file}")
    subprocess.check_call(f"s remove -y -t {s_yaml_file}", shell=True)


def main():
    """
    主函数
    修改 scalingConfig 和 provisionConfig，并测试转换
    """

    subprocess.check_call(f"s deploy -y -t {s_yaml_file} --skip-push", shell=True)

    # GPU remains unchanged
    # 弹性 ----> 弹性
    scalingConfig = {
        "minInstances": 1,
    }
    provisionConfig = None
    deploy_function(scalingConfig, provisionConfig)

    # 弹性 ----> 常驻
    scalingConfig = {
        "residentPoolId": "fc-pool-5f044a31f87171jkwaraws",
        "maxInstances": 1,
    }
    provisionConfig = None
    deploy_function(scalingConfig, provisionConfig)

    # 常驻 ----> 常驻
    scalingConfig = {
        "residentPoolId": "fc-pool-16bedd56db9626uva1it08",
        "maxInstances": 1,
    }
    provisionConfig = None
    deploy_function(scalingConfig, provisionConfig)

    # 常驻 ----> 弹性
    scalingConfig = {
        "minInstances": 1,
    }
    provisionConfig = None
    deploy_function(scalingConfig, provisionConfig)

    cleanup_deployment()

    # GPU remains changed
    # 弹性 ----> 弹性
    scalingConfig = {
        "minInstances": 1,
    }
    gpuConfig = {
        "gpuType": "fc.gpu.tesla.1",
        "gpuMemorySize": 1,
    }
    provisionConfig = None
    memorySize = 32768
    deploy_function(scalingConfig, provisionConfig, gpuConfig, memorySize)

    # 弹性 ----> 常驻
    scalingConfig = {
        "residentPoolId": "fc-pool-16bedd56db9626uva1it08",
        "maxInstances": 1,
    }
    gpuConfig = {
        "gpuType": "fc.gpu.ada.1",
        "gpuMemorySize": 1,
    }
    provisionConfig = None
    memorySize = 65536
    deploy_function(scalingConfig, provisionConfig, gpuConfig, memorySize)

    # 常驻 ----> 常驻
    scalingConfig = {
        "residentPoolId": "fc-pool-16bedd56db96260yid15cs",
        "maxInstances": 1,
    }
    gpuConfig = {
        "gpuType": "fc.gpu.ada.2",
        "gpuMemorySize": 1,
    }
    provisionConfig = None
    memorySize = 32768
    deploy_function(scalingConfig, provisionConfig, gpuConfig, memorySize)

    # 常驻 ----> 弹性
    scalingConfig = {
        "minInstances": 1,
    }
    gpuConfig = {
        "gpuType": "fc.gpu.tesla.1",
        "gpuMemorySize": 1,
    }
    provisionConfig = None
    memorySize = 32768
    deploy_function(scalingConfig, provisionConfig, gpuConfig, memorySize)

    cleanup_deployment()

if __name__ == "__main__":
    main()
