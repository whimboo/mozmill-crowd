#!/usr/bin/env bash

PWD=$(dirname $0)

# Prepare and change into virtual environment
python -B $PWD/scripts/virtualenv.py $PWD
source $PWD/bin/activate

# install dependencies
easy_install --upgrade pip
pip install --upgrade mozmill
pip install --upgrade --global-option="--pure" mercurial
