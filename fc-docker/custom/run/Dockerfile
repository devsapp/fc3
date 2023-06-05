ARG TAG="latest"
FROM golang:1.12.9-stretch as builder

COPY commons/mocker /code

WORKDIR /code

ENV GOPROXY=https://goproxy.cn

RUN go mod download

RUN GOARCH=amd64 GOOS=linux go build -o mock main.go

FROM aliyunfc/runtime-custom:${TAG}

COPY --from=builder /code/mock /var/fc/runtime/custom/mock

ENTRYPOINT ["/var/fc/runtime/custom/mock"]
