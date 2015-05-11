var https = require('https');
var querystring = require('querystring');
var socketio = require('socket.io-client');
//-------------------------------API lib-------------------------------------------
var WO = function(base, accessToken)
{
	var woHost = "https://" + base,
	resourceHost = "https://" + base + "/api/wo/",
	endUserAuthorizationEndpoint = woHost + "/oauth/authorise",
	datastreams = {},
	token = accessToken;
	
	//helper function to extract the Access Token
	var extractToken = function(hash)
	{
		var match = hash.match(/access_token=((%|\w)+)/);
		return !!match && decodeURIComponent(match[1]);
	};

	//public functions

	//query a dataset identified by dataset id
	this.query = function(id, options, callback)
	{
		//var token = extractToken(document.location.hash);
		
		var opts;
		if (typeof options == 'string')
                {
                  //      opts = {query:options};
                        opts = "?query="+querystring.escape(options);
                }
		else if(typeof options == 'object')
		{
			console.log(options);
			
			// check compulsory fields, e.g. 'query' must exist and be a string
			if (options.query && typeof options.query == 'string')
			{
				//opts = options;
				//unfold the object into a url string
				opt = "?"+querystring.stringify(options);
			}
		}
		else
		{
			callback("Options error");
		}
		//console.log(token);
		if (token)
		{
			var options = {
			  host: base,
			  path: '/api/wo/'+ id + '/endpoint'+opts,
			  rejectUnauthorized:false,
			  headers:
				{
					Authorization: 'Bearer ' + token
				}
				
			};

			
			var req = https.get(options, function(res) {
			  //console.log("statusCode: ", res.statusCode);
			  //console.log("headers: ", res.headers);
				var data = '';
				
			  res.on('data', function(d) {
				//process.stdout.write(d);
				data+=d;
			  });
			  res.on('end', function(){callback(null,data)});
			});
			
			req.end();
			req.on('error', function(e) {
			  //console.error(e);
			});
		
		
		
		}
		else
		{
			//TODO return an error code via callback
			//console.log("need to login before making query");
			callback("Not logged in");
			//location.href=authURL;
		}
	};
	
	this.listStream = function(id)
	{
		var rtn = [];
		if (id){
			
			if(typeof datastreams[id] != "undefined")
			{
				for (var i=0; i< datastreams[id].length; i++)
				{
					//console.log(datastreams[id][i].nsp);
					rtn.push(datastreams[id][i].nsp);
				}
			}
		}
		else
		{
			for (var key in datastreams)
			{
				if (datastreams.hasOwnProperty(key))
				{
					for (var i=0; i< datastreams[key].length; i++)
					{
						//console.log(datastreams[key][i].nsp);
						rtn.push(datastreams[key][i].nsp);
					}
				}
			}
			
		}
		return rtn;
	}
	
	this.closeStream = function(id,callback)
	{
		if (id)
		{
			dids = Object.keys(datastreams); //dataset ids
			if (dids.indexOf(id) > -1)
			{
				//matches a dataset id. close this dataset.
				for (var i=0; i< datastreams[id].length; i++)
				{
					//close the connection for all streams within this dataset:
					datastreams[id][i].emit('stop');
				}
				delete datastreams[id];
			}
			else
			{
				//try close it as a stream.
				for (var key in datastreams)
				{
					for (var i=0; i< datastreams[key].length; i++)
					{
						//console.log(datastreams[key][i].nsp);
						if (datastreams[key][i].nsp == id)
						{
							//close the connection for this stream
							datastreams[key][i].emit('stop');
							datastreams[key].splice(i,1);
						}
					}
					
				}
				
			}
			callback(null);
		}
		else{
			callback("No stream id or dataset id provided, or provided id do not match");
		}
		
		
		
	}
	
	//id: dataset id;
	//options: AMQP exchange name
	//callback(err,data,stream)
	this.openStream = function(id, options, callback)
	{
		//var token = extractToken(document.location.hash);
		var opts;
		if (typeof options == 'string')
                {
                        //opts = {query:options};
                        opts = "?query="+querystring.escape(options);
                }
		else if(typeof options == 'object')
		{
			//console.log(options);
			// check compulsory fields, e.g. 'query' must exist and be a string
			if (options.query && typeof options.query == 'string')
			{
				//opts = options;
				opt = "?"+querystring.stringify(options);
			}
		}
		else
		{
			callback("Options error");
		}
		console.log(token);
		if (token)
		{
			var options = {
			  host: base,
			  path: '/api/wo/'+ id + '/endpoint'+opts,
			  rejectUnauthorized:false,
			  headers:
				{
					Authorization: 'Bearer ' + token
				}
			};
			var req = https.get(options, function(res) {
			  //console.log("statusCode: ", res.statusCode);
			  //console.log("headers: ", res.headers);
				var sid = '';
				
			  res.on('data', function(d) {
				 
				//process.stdout.write(d);
				sid+=d;
			  });
			  res.on('end', function(){
				  //console.log(sid);
				  //console.log('here1111');
				  
				  
				  if (sid){
						//try to get the stream data use socket.io
						var socket = socketio('https://webobservatory.soton.ac.uk/' + sid);
						//console.log(socket);
						
						socket.on('chunk', function (data) {
						//console.log(data);
						
						//return the data and the stream object
						callback(null,data,socket);

						});
			
						//add this stream to datastreams variable
						if (typeof datastreams[id] == "undefined")
						{
							datastreams[id] = [socket];
						}
						else
						{
							datastreams[id].push(socket);
						}
					}
				  
				  
				  
				  
				});
			});
			
			req.end();
			req.on('error', function(e) {
			  //console.error(e);
			});
			
			
			
			
			
			/*
			$.ajax(
			{
				type: 'get',
				url: woHost +'/api/wo/'+ id + '/endpoint',
				data: opts,
				headers:
				{
					Authorization: 'Bearer ' + token
				}
			}).done(function(sid)
				{
					//console.log(callback);
					if (sid){
						//try to get the stream data use socket.io
						var socket = io.connect('https://webobservatory.soton.ac.uk/' + sid);
						//console.log(socket);
						
						socket.on('chunk', function (data) {
						//console.log(data);
						
						//return the data and the stream object
						callback(null,data,socket);
						
						});
						
						//add this stream to datastreams variable
						
						if (typeof datastreams[id] == "undefined")
						{
							
							datastreams[id] = [socket];
							
						}
						else
						{
							
							datastreams[id].push(socket);
						}
						
						
						
					}
				}
				);*/

			
			//console.log(id);
			//console.log(options);
			//console.log(woHost +'/api/wo/'+ id + '/endpoint');
			
		}
		else
		{
			//TODO return an error code via callback
			//console.log("need to login before making query");
			callback("Not logged in");
			//location.href=authURL;
		}
	};

};

module.exports = WO;
