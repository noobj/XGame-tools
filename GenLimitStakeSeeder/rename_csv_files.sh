#!/bin/bash
IFS=$(echo -en "\n\b")
for file in $(find . -name "單*"); do
    cp $(echo "${file}") $(echo "${file}" | awk '{print $3}' | sed -n "s/\(.*\)/csv\/s\1/p")
done

for file in $(find . -name "多*"); do
    cp $(echo "${file}") $(echo "${file}" | awk '{print $3}' | sed -n "s/\(.*\)/csv\/m\1/p")
done
