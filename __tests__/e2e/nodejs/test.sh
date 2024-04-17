#! /bin/bash
s remove -y -t s2.yaml
s deploy --function -t s2.yaml
versionId=$(s version publish -t s2.yaml --silent -o json | jq -r '."versionId"')
echo "latest version = $versionId"
if [[ "$versionId" -gt 1 ]]; then
    mainVersion=$((versionId - 1))
    echo "main version = $mainVersion"
    s alias publish --alias-name test --version-id $mainVersion --vw "{\"$versionId\": 0.2}" -t s2.yaml
else
    s alias publish --alias-name test --version-id $versionId -t s2.yaml
fi

s deploy --trigger -t s2.yaml
s deploy --async-invoke-config -t s2.yaml
s info -t s2.yaml
s alias list -t s2.yaml
