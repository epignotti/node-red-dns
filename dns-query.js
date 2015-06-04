/**
 * Copyright 2015, Nominet UK
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/


var dns = require('native-dns');


module.exports = function (RED) {
    "use strict";

    function DnsQueryNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;
        this.on("input", function (msg) {



            var req = null;

            msg.dnsResponse = {};

            if (msg.dnsQuery.name && msg.dnsQuery.type) {

                var timeout = 25000;


                if (msg.dnsQuery.timeout) timeout = msg.dnsQuery.timeout;

                var question = dns.Question({
                    name: msg.dnsQuery.name,
                    type: msg.dnsQuery.type
                });

                req = dns.Request({
                    question: question,
                    server: {address: "8.8.8.8", port: 53, type: "udp"},
                    timeout: timeout
                });

                if (req) {
                    req.on("timeout", function () {
                        console.log("[node-red-dns] dns://"+msg.dnsQuery.name+"?type="+ msg.dnsQuery.type +" Request timeout");
                        msg.dnsResponse.type = "Error";
                        msg.dnsResponse.value = "Request Timeout";
                        node.send(msg);
                    });

                    req.send();

                } else {
                    msg.dnsResponse.type = "Error";
                    msg.dnsResponse.value = "Malformed or missing dns query";
                }
            } else {
                msg.dnsResponse.type = "Error";
                msg.dnsResponse.value = "Malformed or missing dns query";
            }

            req.on('message', function (err, answer) {

                answer.answer.forEach(function (a) {
                    if (a.type == 1) {	// A
                        msg.dnsResponse.type = "A";
                        msg.dnsResponse.value = a.address;
                    }
                    else if (a.type == 16) {	// TXT
                        //TODO: Handle text record better
                        var str = "";

                        for (var i = 0; i < a.data.length; i++) {
                            str = str + a.data[i]
                        }

                        msg.dnsResponse.type = "TXT";
                        msg.dnsResponse.value = str;
                    }
                    else if (a.type == 33) {	// SRV
                        msg.dnsResponse.type = "SRV";
                        msg.dnsResponse.value = a.target;
                    }
                    else if (a.type == 256) {	// URI
                        msg.dnsResponse.type = "URI";
                        msg.dnsResponse.value = a.target;
                    } else {
                        msg.dnsResponse.type = "Error";
                        msg.dnsResponse.value = "Message not recognised";
                    }
                });
                node.send(msg);
            });

        });
    }

    RED.nodes.registerType("dns-query", DnsQueryNode);
}
