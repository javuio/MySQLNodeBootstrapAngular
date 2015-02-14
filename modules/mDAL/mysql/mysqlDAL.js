﻿var mysql = require('mysql');
var log = require('mLogger/logger.js');


function mysqlConn() {
    this.connectionPool = null;
    this.initialized = false;
}

mysqlConn.prototype = {
    init: function (config) {
        this.connectionPool = mysql.createPool(config);
        this.initialized = true;
    }
    /// if the raw connection is needed
    ,getConnection: function (callback) {
        if (!this.initialized) {
            callback(new Error("Connection not initialized"));
            return;
        }
        
        this.connectionPool.getConnection(function (err, connection) {
            // Use the connection
            if (err)
                log.error('#Database -> Connection: ' + JSON.stringify(err));
            if (callback) callback(err, connection);
            connection.release();
        });
    }
    ,executeSP: function (procedureName, params, callback) {
        if (!this.initialized) {
            callback(new Error("Connection not initialized"));
            return;
        }
        if (typeof (params) == "function" && callback == undefined) {
            callback = params;
            params = null;
        }
        var sql = 'CALL ' + procedureName + '(params)';
        
        sql = this._injectParams(sql, params);
        //Execute stored procedure call
        this.connectionPool.query(sql, function (err, rows, fields) {
            if (err) {
                if (err.code == 'ER_SIGNAL_EXCEPTION' && err.sqlState == '45000' && err.message) {
                    var errorCode = err.message.replace('ER_SIGNAL_EXCEPTION: ', '');
                    log.warn('#Database -> Stored Procedure: ' + sql + ' Error code ##' + errorCode + '## was recieved while executing stored procedure :' + JSON.stringify(err));
                    err.errorCode = errorCode;
                }
                else {
                    log.error('#Database -> Stored Procedure: ' + sql + ' an error has occured while executing stored procedure :' + JSON.stringify(err));
                }
                
                callback(err, null);
            }
            else {
                log.debug('#Database -> Stored Procedure: ' + sql + ' connected to database successfully');
                callback(null, rows);
            }
        });
    }
    
    ,_injectParams: function (query, params) {
        //Inject parameters in Stored Procedure Call
        var parameters = '';
        if (params) {
            params.forEach(function (param, index) {
                if (param == null || param.value == null)
                    parameters += "null";
                else{
                    try{
                        parameters += "@" + param.name + ':=' + mysql.escape(param.value);
                    }
                catch(e)
                    {
                        console.log(e);
                        throw e;
                    }
                }

                
                if (index < params.length - 1) parameters += ",";

            });
        }
        query = query.replace("params", parameters);
        return query;
    }
    
    , createCommand: function (procedureName) {
        return new mysqlCommand(procedureName, this);
    }
};

function mysqlCommand(procedureName, connectionPool) {
    this.connectionPool = connectionPool;
    this.procedureName = procedureName;
    this.params = [];
}

mysqlCommand.prototype = {
    addParam: function (name, value) {
        this.params.push({ "name": name , "value" : value });
    }
    ,getDataSet: function (callback) {
        this.connectionPool.executeSP(this.procedureName, this.params, function (err, data) {
            if (err)
                callback(err, null);
            else {
                if (data)
                    callback(null, data);
                else
                    callback(null, null);
            }
        });
    }
    ,getDataTable: function (callback) {
        this.getDataSet(function (err, data) {
            if (err)
                callback(err, null);
            else {
                if (data && data.length > 0)
                    callback(null, data[0]);
                else
                    callback(null, []);
            }
        });
    }
    ,getDataObject: function (callback) {
        this.getDataTable(function (err, data) {
            if (err)
                callback(err, null);
            else {
                if (data && data.length > 0)
                    callback(null, data[0]);
                else
                    callback(null, null);
            }
        });
    }
    ,getScalar: function (callback) {
        this.getDataObject(function (err, data) {
            if (err)
                callback(err, null);
            else {
                if (data != null) {
                    var key = Object.keys(data);
                    callback(null, data[key[0]]);
                } 
                else
                    callback(null, null);
            }
        });
    }
}

module.exports = mysqlConn;