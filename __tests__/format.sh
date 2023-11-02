# !/bin/bash

# format python
black ./e2e/custom/python
black ./e2e/custom.debian10/python
black ./e2e/python

# format golang
function read_dir(){
  for file in `ls $1`
  do
    if [ -d $1"/"$file ]
    then
      read_dir $1"/"$file
    else
      gofile=$1"/"$file
      if [[ "$gofile" == *go ]]; then
          echo "$gofile std formating .."
          go fmt $gofile
          golint $gofile
          goimports -w $gofile
      fi
  fi
  done
}
read_dir ./e2e/custom/go
read_dir ./e2e/custom.debian10/go
read_dir ./e2e/go
