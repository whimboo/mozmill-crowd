#!/usr/bin/env bash

PWD=$(dirname $0)

# Change into the virtual environment
source $PWD/bin/activate

if [ $# -gt 0 ]; then
    # start test-run
    $1 $2 $3 $4 $5 $6 $7 $8 $9
else
    PS1=$PS1"$ "
    $(bash --norc)
fi

