#!/bin/bash

# change into the virtual environment and check for updates
source $1/release/bin/activate
easy_install -U mozmill jsbridge mozrunner

# start test-run
$(which python) $2 $3 $4 $5 $6 $7 $8 $9
