#!/bin/bash

wget https://bitbucket.org/ianb/virtualenv/raw/tip/virtualenv.py
python mac_bootstrap.py mozmill
rm virtualenv*
mv mozmill.py ../extension/scripts/Darwin
