git submodule init
git submodule update --recursive

npm install --cwd ".\system\server" --prefix ".\system\server" && npm install --cwd ".\webxr-server" --prefix ".\webxr-server" && npm install -g pm2
