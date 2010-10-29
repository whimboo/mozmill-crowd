#!/usr/bin/env python

# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla Corporation Code.
#
# The Initial Developer of the Original Code is the Mozilla Foundation.
# Portions created by the Initial Developer are Copyright (C) 2010
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Henrik Skupin <hskupin@gmail.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

'''
    Use this script to build the IPC XPCOM component for the platform the
    script was executed from.
    
    This component is not included in the mozilla-central repository. Current
    work happens on https://bugzilla.mozilla.org/show_bug.cgi?id=68702. Lets
    grab the latest revision of the patch to work with.
'''

IPC_PATCH_LOCATION = "https://bugzilla.mozilla.org/attachment.cgi?id=486170"

''' Don't change anything below this line '''

import errno
import optparse
import os
import re
from stat import *
from subprocess import check_call
import sys
import urllib

def get_obj_path(config_file):
  path = None

  try:
      file = open(config_file, "r")
      content = file.read()

      # Extract the MOZ_OBJDIR setting from the config file
      path = re.search(r"mk_add_options\sMOZ_OBJDIR=(.*)", content)

      # If a top source dir is given replace it with the source tree path
      path = path.group(1).replace("@TOPSRCDIR@", os.path.dirname(config_file))
      path = os.path.abspath(path)
  finally:
      file.close()
      return path

def main():
  usage = "usage: %prog repository_path"
  parser = optparse.OptionParser(usage=usage, version="%prog 0.1")
  (options, args) = parser.parse_args()

  if len(args) != 1:
      print "Please use the path of the local Firefox source tree as argument."
      sys.exit(errno.EINVAL)

  # Check if the given path is a valid source tree
  path_source = os.path.abspath(args[0])
  path_obj = get_obj_path(os.path.join(path_source, ".mozconfig"))
  if path_obj:
      print "OBJDIR found at %s" % os.path.abspath(path_obj)
  else:
      print "Failure while reading the obj dir from .mozconfig file."
      sys.exit(errno.EINVAL)

  print "Download IPC-Pipe patch from Bug 68702..."
  (filename, headers) = urllib.urlretrieve(IPC_PATCH_LOCATION)

  try:
      # Patching source tree
      print "Apply IPC-Pipe patch to local source tree..."
      check_call(["patch", "-p1", "-s", "-d", path_source, "-i", filename])
    
      # Build IPC-Pipe component
      print "Build IPC-Pipe component..."
      path = os.path.join(path_source, "extensions", "ipc-pipe")
      makefile = os.path.join(path, "makemake")

      check_call(["chmod", "u+x", makefile])
      os.chdir(path)
      check_call(makefile)

      path = os.path.join(path_obj, "extensions", "ipc-pipe")
      os.chdir(path)
      check_call(["make"])

      path = os.path.join(path_obj, "extensions", "ipc-pipe", "build")
      print "Binary component can be found in '%s'." % path

  finally:
      # Reverting patch
      print "Revert applied patch from local source tree..."
      check_call(["patch", "-p1", "-R", "-s", "-d", path_source, "-i", filename])

  os.remove(filename)


if __name__ == "__main__":
    main()
