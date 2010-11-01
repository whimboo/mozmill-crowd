#!/bin/bash

wget https://bitbucket.org/ianb/virtualenv/raw/tip/virtualenv.py
python virtualenv/mac_bootstrap.py mozmill
rm virtualenv.py

# Move to package folder
#mv mozmill.py ../extension/resource/scripts
