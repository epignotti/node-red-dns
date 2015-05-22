/**
 * Copyright 2015 Nominet UK (http://www.nominet.org.uk).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * This software is provided 'as-is', without any express or implied warranty.
 * No representation is provided that this software is suitable or fit for
 * any purpose. In no event will Nominet be held liable for any damages
 * arising from the use of this software, unless such liability may not be
 * excluded or limited as a matter of law.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, save that altered source versions must be plainly marked as
 * such, and must not be misrepresented as being the original software.
 * Your use of the software and our relationship is subject to English law
 * and the exclusive jurisdiction of the English courts.
 **/


var dns = require('native-dns');


module.exports = function (RED) {
    "use strict";

    function DnsQueryNode(config) {
        var newmsg = {};

        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', function (msg) {
            var question = dns.Question({
                name: msg.payload.name,
                type: msg.payload.type
            });

            var req = dns.Request({
                question: question,
                server: {address: '8.8.8.8', port: 53, type: 'udp'},
                timeout: 1000
            });

            req.on('timeout', function () {
                console.log('Timeout in making request');
            });

            req.on('message', function (err, answer) {
                answer.answer.forEach(function (a) {
                    if (a.type == 1) {	// A
                        newmsg.topic = "A";
                        newmsg.payload = a.address;
                    }
                    else if (a.type == 16) {	// TXT
                        for (var i = 0; i < a.data.length; i++) {
                            newmsg.topic = "TXT";
                            newmsg.payload = a.data[i];
                        }
                    }
                    else if (a.type == 33) {	// SRV
                        newmsg.topic = "SRV";
                        newmsg.payload = a.target;
                    }
                    else if (a.type == 256) {	// URI
                        newmsg.topic = "URI";
                        newmsg.payload = a.target;
                    }
                });
                node.send(newmsg);
            });
            req.send();
        });
    }

    RED.nodes.registerType("dns-query", DnsQueryNode);
}
