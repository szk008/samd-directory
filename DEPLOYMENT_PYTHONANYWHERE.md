# Deployment Guide: PythonAnywhere

## 1. Prepare Your Environment
1.  **Log in** to your PythonAnywhere Dashboard.
2.  Open a **Bash Console**.

## 2. Upload Code
Since you are replacing the old code, you can upload the zip or pull from git.
Ensure your file structure matches:
```
/home/yourusername/Directory/
├── backend/
│   ├── app.py
│   └── ...
├── web/
│   └── ...
```

## 3. Virtual Environment (Recommended)
```bash
cd ~/Directory
mkvirtualenv --python=/usr/bin/python3.10 myenv
pip install flask flask-sqlalchemy flask-cors requests
```

## 4. Updates WSGI Configuration
1.  Go to the **Web** tab.
2.  Click the link to edit your **WSGI configuration file**.
3.  Replace the content with:

```python
import sys
import os

# 1. Add your project directory to the sys.path
path = '/home/yourusername/Directory'  # <--- CHECK THIS PATH
if path not in sys.path:
    sys.path.append(path)

# 2. Activate virtualenv (if used)
# activate_this = '/home/yourusername/.virtualenvs/myenv/bin/activate_this.py'
# with open(activate_this) as file_:
#     exec(file_.read(), dict(__file__=activate_this))

# 3. Import the app
from backend.app import app as application
```

## 5. Reload
1.  Go back to the **Web** tab.
2.  Click the green **Reload** button.

## 6. Verify
Visit your website URL. If it works, check `/api/search` to confirm the backend is up.
