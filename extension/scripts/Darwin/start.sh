#!/bin/bash

# change into the virtual environment and check for updates
source $1/env/bin/activate
easy_install -U mozmill jsbridge mozrunner

# start test-run
python -u $2 $3 $4 $5 $6 $7 $8 $9
