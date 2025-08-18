#!/bin/bash

# 定义日志文件
LOG_FILE="test_models.log"

# 清空或创建日志文件
> "$LOG_FILE"

# 日志记录函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 定义模型列表 (每个元素包含model_version, model_id, task)
MODEL_LIST=(
    '{"model_version": "v2.4.0", "model_id": "iic/cv_convnextTiny_ocr-recognition-general_damo", "task": "ocr-recognition", "input":{"image":"http://modelscope.oss-cn-beijing.aliyuncs.com/demo/images/image_ocr_recognition.jpg"}'
    '{"model_version": "master", "model_id": "iic/SenseVoiceSmall", "task": "auto-speech-recognition", "input": "https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/asr_example_zh.wav"}'
)

# 检查yaml文件是否存在
YAML_FILE="s.yaml"
if [ ! -f "$YAML_FILE" ]; then
    log "Error: $YAML_FILE not found!"
    exit 1
fi

# 遍历每个model_id
for MODEL_INFO in "${MODEL_LIST[@]}"; do
    log "========================================"
    log "Testing model: $MODEL_INFO"
    log "========================================"
    # 从JSON对象中提取字段 (使用 jq)
    export MODEL_VERSION=$(echo "$MODEL_INFO" | grep -o '"model_version": *"[^"]*' | awk -F'"' '{print $4}')
    export MODEL_ID=$(echo "$MODEL_INFO" | grep -o '"model_id": *"[^"]*' | awk -F'"' '{print $4}')
    export TASK=$(echo "$MODEL_INFO" | grep -o '"task": *"[^"]*' | awk -F'"' '{print $4}')
    INPUT=$(echo "$MODEL_INFO" | grep -o '"input": *"[^"]*' | awk -F'"' '{print $4}')
    
    # 生成随机函数名
    RANDOM_STRING=$(openssl rand -hex 10)
    export fc_component_function_name=ai-model-qwen-$RANDOM_STRING
    export NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT=10000
    
    # 下载模型
    log "Downloading model..."
    DOWNLOAD_OUTPUT=$(s model download -t s-pipeline.yaml 2>&1)
    echo "$DOWNLOAD_OUTPUT" >> "$LOG_FILE"
    echo "$DOWNLOAD_OUTPUT"
    if echo "$DOWNLOAD_OUTPUT" | grep -q "Error"; then
        log "Failed to download model: $MODEL_ID"
        continue
    fi
    
    # 部署服务
    log "Deploying..."
    DEPLOY_OUTPUT=$(s deploy -t s-pipeline.yaml -y 2>&1)
    echo "$DEPLOY_OUTPUT" >> "$LOG_FILE"
    echo "$DEPLOY_OUTPUT"
    
    # 检查部署是否成功
    if echo "$DEPLOY_OUTPUT" | grep -q "state:.*Active"; then
        log "Deployment successful for model: $MODEL_ID"
    else
        log "Deployment failed for model: $MODEL_ID"
        # 清理资源
        REMOVE_OUTPUT=$(s model remove -t s-pipeline.yaml -y 2>&1)
        echo "$REMOVE_OUTPUT" >> "$LOG_FILE"
        echo "$REMOVE_OUTPUT"
        REMOVE_OUTPUT=$(s remove -t s-pipeline.yaml -y 2>&1)
        echo "$REMOVE_OUTPUT" >> "$LOG_FILE"
        echo "$REMOVE_OUTPUT"
        continue
    fi
    
    # 提取system_url
    SYSTEM_URL=$(echo "$DEPLOY_OUTPUT" | grep "system_url:" | sed 's/.*system_url: *//' | tr -d ' "[:cntrl:]')
    if [ -z $SYSTEM_URL ]; then
        log "Failed to extract system_url for model: $MODEL_ID"
        # 清理资源
        REMOVE_OUTPUT=$(s model remove -t s-pipeline.yaml -y 2>&1)
        echo "$REMOVE_OUTPUT" >> "$LOG_FILE"
        echo "$REMOVE_OUTPUT"
        REMOVE_OUTPUT=$(s remove -t s-pipeline.yaml -y 2>&1)
        echo "$REMOVE_OUTPUT" >> "$LOG_FILE"
        echo "$REMOVE_OUTPUT"
        continue
    fi
    log "Extracted system_url: $SYSTEM_URL"
    
    # 发送测试请求
    log "Sending test request..."
    CURL_OUTPUT=$(curl -v -d '{"input":$INPUT}' $SYSTEM_URL 2>&1)
    
    echo "$CURL_OUTPUT" >> "$LOG_FILE"
    echo "$CURL_OUTPUT"
    
    # 检查curl请求是否成功
    if echo "$CURL_OUTPUT" | grep -q '"object":"chat.completion"'; then
        log "Model test successful for: $MODEL_ID"
        # 提取并显示模型回复内容
        RESPONSE_CONTENT=$(echo "$CURL_OUTPUT" | sed -n 's/.*"text":"\([^"]*\)".*/\1/p' | sed 's/\\n/\n/g' | sed 's/\\t/\t/g')
        log "Model response: $RESPONSE_CONTENT"
    else
        log "Model test failed for: $MODEL_ID"
    fi
    
    # 清理资源
    log "Removing resources..."
    REMOVE_OUTPUT=$(s model remove -t s-pipeline.yaml -y 2>&1)
    echo "$REMOVE_OUTPUT" >> "$LOG_FILE"
    echo "$REMOVE_OUTPUT"
    REMOVE_OUTPUT=$(s remove -t s-pipeline.yaml -y 2>&1)
    echo "$REMOVE_OUTPUT" >> "$LOG_FILE"
    echo "$REMOVE_OUTPUT"
    
    log ""
    log "Finished testing model: $MODEL_ID"
    log ""
done

log "All models tested."