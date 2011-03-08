#!/usr/bin/env bash

PWD=$(dirname $0)

# Prepare and change into virtual environment
python -B $PWD/scripts/virtualenv.py $PWD
source $PWD/bin/activate

# install dependencies
easy_install -U mercurial mozrunner jsbridge mozmill
