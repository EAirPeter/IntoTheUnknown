// file: main.js
// authors: Nicholas G Vitovitch <ngv220@nyu.edu>, Karl Toby Rosenberg <ktr254@nyu.edu>
//
// A minimal static webpage demonstrating a shared VR environment
// using WebXR.
//
// NOTE: WebXR !!!REQUIRES!!! a secure context in order to run (i.e. URL must
// begin with https:// or localhost), otherwise `navigator.xr` is undefined!

const fs        = require('fs');
const express   = require('express');
const WebSocket = require('ws');
const argparse  = require('argparse');
const path      = require('path');
const chokidar  = require('chokidar');

const parser = new argparse.ArgumentParser({
  version : '0.0.1',
  addHelp : true,
  description: 'metaroom server'
});

parser.addArgument(
	['--host' ],
	{
		help: 'hostname',
		defaultValue: '127.0.0.1'
	}
);
parser.addArgument(
	[ '-p', '--port' ],
	{
	help: 'port to listen on',
	defaultValue: 3000
	}
);
parser.addArgument(
  [ '-i', '--interval' ],
  {
    help: 'interval to broadcast to clients',
    defaultValue: 3000
  }
);
parser.addArgument(
	['-d', '--debug'],
	{
		help: 'enable additional status print-outs',
		defaultValue: true
	}
);
parser.addArgument(
    ['-ssl', '--enablessl'],
    {
        help: 'enable SSL for use with HTTPS/certificates',
        defaultValue: false
    }
);
parser.addArgument(
    ['-mu', '--multiuser'],
    {
        help: 'enable multiuser world synchronization',
        defaultValue: true
    }
);

const args     = parser.parseArgs();

const https    = require('https');
const http     = require('http');
const host     = args.host;
const port     = parseInt(args.port);
let   interval = args.interval;
const multiuser = args.multiuser;

if (parser.version) {
	console.log("Version:", 1.0);
}
console.log(process.cwd(), __dirname);

function walk(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
      if (error) {
        return reject(error);
      }
      Promise.all(files.map((file) => {
        return new Promise((resolve, reject) => {
          const filepath = path.join(dir, file);
          fs.stat(filepath, (error, stats) => {
            if (error) {
              return reject(error);
            }
            if (stats.isDirectory()) {
              walk(filepath).then(resolve);
            } else if (stats.isFile()) {
              resolve(filepath);
            }
          });
        });
      }))
      .then((foldersContents) => {
        resolve(foldersContents.reduce((all, folderContents) => all.concat(folderContents), []));
      });
    });
  });
}

let allWorlds = '';
const WORLD_HEADER = `"use strict";
//MR.registerWorld((function() {
`;

function generatePathInfo(rootPath) {
	return `
    const MY_ROOT_PATH = \"` + rootPath + `\";
    function getPath(path) {
      if (!path || path.length < 1) {
        return;
      }
      if (path.charAt(0) !== '/') {
        path = '/' + path;
      }

      return MY_ROOT_PATH + path;
    }
    `;
}

const WORLD_FOOTER = 'export default main;\n';//`return main; }()));`;
let worldsSources = [];

const dblog = (args.debug) ? console.log   : () => {};
const dberr = (args.debug) ? console.error : () => {};

const testingNonRoot = false;

const systemRoot = './';
const clientDir = 'worlds';

async function preprocess(prefix, dir) {
  return new Promise((resolve, reject) => {

    fs.readdir(path.join(prefix, dir), async (error, files) => {
      if (error) {
        return reject(error);
      }

      let confpath = null;
      let confpathshortname = null;
      let dirs = [];
      for (let i = 0; i < files.length; i += 1) {
      	const filepath = path.join(prefix, dir, files[i]);
      	const filepathsansprefix = path.join(dir, files[i]);
      	const stats = fs.statSync(filepath);
      	if (stats.isDirectory()) {
      		dirs.push(filepathsansprefix);
      	} else if (stats.isFile()) {
      		if (filepath.endsWith('.mr.json')) {
      			confpath = filepath;
      			confpathshortname = filepathsansprefix;
      		}
      	}
      }

      if (confpath) {
      	console.log("config file found at: " + confpathshortname, confpath, dir);

      	const confFile = JSON.parse(fs.readFileSync(confpath, 'utf8'));
      	dblog(confFile);

      	const shaders = confFile.shaders;
      	const files = confFile.fileorder;

      	const fileSources = {rootPath : dir, array : []};
		Promise.all(files.map(async (file, idx) => {
		    return new Promise((resolve, reject) => {
		    	fs.readFile(path.join(prefix, dir, file), 'utf8', (err, data) => {
		    		if (err) {
		    			dberr(err);
		    			reject();
		    		} else {
		    			fileSources.array[idx] = {
		    				src : data, 
		    				relPath : path.join(dir, file), 
		    				absPath : path.join(prefix, dir, file),
		    				rootPath : dir, 
		    				name : path.join(file),
		    				config : confFile
		    			};
		    			resolve();
		    		}
		    	});
		    }).catch((err) => { dberr(err); });
		}))
		.then(() => {

			let world = WORLD_HEADER + generatePathInfo(fileSources.rootPath);

			const arr = fileSources.array;
			for (let i = 0; i < arr.length; i += 1) {
				world += arr[i].src;
			}

			world += WORLD_FOOTER;

			worldsSources.push(world);

			resolve();

		}).catch((err) => { dberr(err); });

	  } else {
      	for (let i = 0; i < dirs.length; i += 1) {
      		dblog(prefix, dirs[i]);
      		await preprocess(prefix, dirs[i]);
      	}
      	resolve();
      }
    });
  })
}

// collect files

/*
preprocess(
	systemRoot,
	clientDir
).then((err, data) => {
	fs.writeFile(
		path.join(systemRoot, clientDir, 'worlds.js'), 
		worldsSources.join('\n\n'), 
		(err) => {

		if (err) {
			dberr(err);
			return;
		} */

const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.crt')),
  requestCert: false,
  rejectUnauthorized: false
};

let app = express();

let frontend = express.static(systemRoot);

app.use(frontend);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const server = (args.enablessl) ? https.createServer(options, app) : http.createServer({}, app);

// temp
app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

if (!args.enablessl) {
    app.listen(port, () => {
      console.log('MetaRoom server listening on port ' + port);
    });
} else {
    server.listen(port, () => {
      console.log('MetaRoom server listening on port ' + server.address().port);
    });
}

const timeStart = Date.now();

try {
	const wss = new WebSocket.Server({ port: (port + 1)});

	function exitHandler(options, exitCode) {
		watcher.close();
	    if (options.cleanup) {
	    	dblog('clean');
	    	try {
	    		wss.close();
	    	} catch (err) {
	    		dberr(err);
	    	}
	    }
	    if (exitCode || exitCode === 0) {
	    	try {
	    		wss.close();
	    	} catch (err) {
	    		dberr(err);
	    	}
	    	dblog(exitCode);
	    }
	    if (options.exit) {
	    	try {
	    		wss.close();
	    	} catch (err) {
	    		dberr(err);
	    	}
	    	process.exit();
	    }
	}
	//do something when app is closing
	process.on('exit', exitHandler.bind(null,{cleanup:true}));

	//catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null, {exit:true}));

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
	process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

	//catches uncaught exceptions
	process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

	let websocketMap = new Map();
	let userMap      = new Map();
	let wsIndex      = 0;

	const watcher = chokidar.watch('file', {
	  ignored: /(^|[\/\\])\../,
	  persistent: true
	});

	const log = console.log.bind(console);

	let worldIdx = 0;

	watcher
	  .on('add', path => log(`File ${path} has been added`))
	  .on('change', path => {
	  	log(`File ${path} has been changed`);

	  	fs.readFile(path, 'utf8', (err, data) => {
	  		if (err) {
	  			console.error(err);
	  			return;
	  		}

	  		for (let sock__ of websocketMap.values()) {
  				sock__.send(JSON.stringify({
  					"MR_Message" : "Update_File", "file" : path, "content" : data
  				}));
			}
	  	});
	  })
	  .on('unlink', path => log(`File ${path} has been removed`))
	  .on('unwatch', path => log(`File ${path} has been removed`));

	const toInit = new Map();
	let timerID = null;
	wss.on('connection', function(ws) {
		ws.index = wsIndex++;
		websocketMap.set(ws.index, ws);

		console.log("connection:", ws.index);

		worldsSources = [];

		toInit.set(ws.index, ws);

		// ws.send(JSON.stringify({
		//     "MR_Message" : "Load_World", "key" : worldIdx, "content" : "TODO", "count" : ""})
		// ); //<- BUG?
		
		ws.send(JSON.stringify({
		    "MR_Message" : "Init", "key" : worldIdx, uid : ws.index})
		); //<- BUG?

		// preprocess(
		// 	systemRoot,
		// 	clientDir
		// ).then((err, data) => {

		// 	fs.writeFile(
		// 		path.join(systemRoot, clientDir, 'worlds.js'),
		// 		worldsSources.join('\n\n'), 
		// 		(err) => {

		// 			if (err) {
		// 				dberr(err);
		// 			}
					
		// 			for (let [key, value] of websocketMap) {
		// 				ws.send(JSON.stringify({load : true}));
		// 			}
		// 		}
		// 	);
		// });

		ws.on('message', (data) => {
			const msg = JSON.parse(data);
			const cmd = msg.MR_Message;

			if (cmd) {
				switch (cmd) {
				case "Echo": {
					ws.send(data);		
					break; 
				}
				case "Write_Files": {
					const date = new Date();
					const dateString = 	"_y_" + date.getFullYear() + 
										 "_m_" + (date.getMonth() + 1) + 
										 "_d_" + (date.getDay() + 1) +
										 "_h_" + date.getHours() +
										 "_s_" + date.getSeconds() +
										 "_stamp_" + Date.now();

					const files = msg.files;
					const fcount = files.length;
					for (let i = 0; i < fcount; i += 1) {
						let fPath = path.join(systemRoot, files[i].path);

						console.log("saving at path:", fPath);
						if (files[i].opts.guardAgainstOverwrite && fs.existsSync(fPath)) {
							console.log("file with same path found, modifying name");
							extDotIdx = fPath.lastIndexOf('.');
							
							if (extDotIdx == -1) {
								fPath += dateString;
							} else {
								fPath = fPath.substring(0, extDotIdx) + 
										dateString +
										fPath.substring(extDotIdx);
							}
						}

						fs.writeFile(
							fPath,
							files[i].text,
							(err) => { if (err) { dberr(err); } }
						);
					}
					break;
				}
				case "Watch_Files": {
					console.log("Watch_Files command received");
					watcher.add(msg.files);

					break;
				}
				case "Unwatch_Files": {
					console.log("Unwatch_Files command received");
					watcher.unwatch(msg.files);

					break;
				}
				case "Load_World": {
					// console.log("Load_World command received");

					// if (msg.mode && msg.mode == "get") {
					// 	let i__ = 0;
					// 	msg.key = worldIdx;
						
					// 	const newData = JSON.stringify(msg);

			  // 			ws.send(newData);

					// 	break;
					// }


					worldIdx = msg.key;
					let i__ = 0;
			  		for (let sock__ of websocketMap.values()) {
			  			console.log("Sending load world command to " + i__);
		  				sock__.send(data);
		  				i__ += 1;
					}
					console.log(worldIdx);
					break;
				}
				case "Init": {
					ws.send(JSON.stringify({"MR_Message" : "Init", "key" : worldIdx}));
					break;
				}
				case "Broadcast_All": {
					// TODO
					break;
				}
				case "Broadcast_To": {
					// TODO
					break;
				}
				case "User_State": {
					for (let sock__ of websocketMap.values()) {
						if (sock__.index == ws.index) {
							continue;
						}
						if (sock__.readyState === ws.OPEN) {
							sock__.send(data);
						}
					}
					break;
				}
				default: {

				}
				// case "Confirm_Connection": {
				// 	toInit.delete(ws.index);
				// 	console.log("connection confirmed, sending init info");
				// 	ws.send(JSON.stringify({
		  //             "MR_Message" : "Load_World", "key" : worldIdx, "content" : "TODO", "count" : ""})
		  //           );

				// 	break;
				// }
				}
			}
		});

		ws.on('close', () => {
			websocketMap.delete(ws.index);
			toInit.delete(ws.index);
			console.log("close:", ws.index, "websocketMap.keys() updated:", Array.from(websocketMap.keys()));

			for (let sock__ of websocketMap.values()) {
				if (sock__.index == ws.index) {
					console.log("Ignoring self update");
					continue;
				}
				if (sock__.readyState === ws.OPEN) {
					sock__.send(JSON.stringify({"MR_Message" : "User_Leave", "info" : { uid : ws.index }}));
				}
			}
		});
	});

	wss.on('close', function() {
		clearInterval(timerID);
		console.log("closing");
	})

	if (multiuser) {
		setInterval(() => {
			// for (let sock__ of toInit.values()) {
			// 	sock__.send(JSON.stringify({
	  //             "MR_Message" : "Load_World", "key" : worldIdx, "content" : "TODO", "count" : ""})
	  //           );
			// }
		}, interval)
	}

} catch (err) {
	console.error("couldn't load websocket", err);
}

