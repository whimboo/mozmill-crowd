import virtualenv
import textwrap

output = virtualenv.create_bootstrap_script(textwrap.dedent("""
import os, subprocess
def after_install(options, home_dir):
    etc = join(home_dir, 'etc')
    if not os.path.exists(etc):
        os.makedirs(etc)
    subprocess.call([join(home_dir, 'bin', 'easy_install'),
                     'mercurial'])
    subprocess.call([join(home_dir, 'bin', 'easy_install'),
                     'mozmill'])
    subprocess.call([join(home_dir, 'bin', 'easy_install'),
                     'httplib2'])
"""))

f = open('mozmill.py', 'w').write(output)
