#!/bin/bash

python mozmill.py $1/env
source $1/env/bin/activate

hg clone https://hg.mozilla.org/qa/mozmill-automation/
hg clone https://hg.mozilla.org/qa/mozmill-tests/
