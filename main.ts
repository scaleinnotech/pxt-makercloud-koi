/*
Riven
Modified by Max@SCALE
load dependency
"makercloud": "file:../pxt-makercloud"
*/

//% color="#31C7D5" weight=10 icon="\uf1eb"
//% groups='["Connection", "Publish", "Subscribe"]'
namespace MakerCloud_KOI {

    const PortSerial = [
        [SerialPin.P8, SerialPin.P0],
        [SerialPin.P12, SerialPin.P1],
        [SerialPin.P13, SerialPin.P2],
        [SerialPin.P15, SerialPin.P14]
    ]

    export enum SerialPorts {
        PORT1 = 0,
        PORT2 = 1,
        PORT3 = 2,
        PORT4 = 3
    }

    type EvtStr = (data: string) => void;
    type EvtAct = () => void;
    type EvtNum = (data: number) => void;
    type EvtDict = (topic: string, data: string) => void;

    type Evtss = (t1: string, t2: string) => void;
    let mqttDataEvt: Evtss = null;

    let SERIAL_TX = SerialPin.P2
    let SERIAL_RX = SerialPin.P1

    let PROD_SERVER = "mqtt.makercloud.io"
    let SIT_SERVER = "mqtt.makercloud-sit.io"
    let SERVER = PROD_SERVER
    let ipAddr: string = '';
    let v: string;
    let topics: string[];

    let isInit = false;
    let isSetup = false;
    let isSubscribe = false;

    export class StringMessageHandler {
        topicName: string;
        fn: (stringMessage: string) => void;
    }

    export class KeyStringMessageHandler {
        topicName: string;
        fn: (key: string, value: string) => void;
    }

    export class KeyValueMessageHandler {
        topicName: string;
        fn: (key: string, value: number) => void;
    }

    let stringMessageHandlerList: StringMessageHandler[] = [
        new StringMessageHandler()
    ]
    let keyStringMessageHandlerList: KeyStringMessageHandler[] = [
        new KeyStringMessageHandler()
    ]
    let keyValueMessageHandlerList: KeyValueMessageHandler[] = [
        new KeyValueMessageHandler()
    ]

    export class KeyStringMessage {
        key: string;
        inText: string;
    }
    export class KeyValueMessage {
        key: string;
        value: number;
    }

    export class MakerCloudMessage {
        deviceName: string;
        deviceSerialNumber: string;
        rawMessage: string;
        stringMessageList: string[];
        keyStringMessageList: KeyStringMessage[];
        keyValueMessagList: KeyValueMessage[];
    }

    //Block in Advance
    /**
    * For testing purpose
    */
    //% blockId=mc_kt_change_to_sit
    //% block="MakerCloud Lab"
    //% advanced=true
    export function changeToSitServer() {
        SERVER = SIT_SERVER
    }
    //Block in Connection
    /**
     * Connect to MakerCloud MQTT Server
     */
    //% blockId=mc_kt_connect_mc_mqtt
    //% block="connect MakerCloud MQTT"
    //% group="Connection"
    //% weight=101
    export function connectMakerCloudMQTT() {
        serial.writeLine(`K51 ${SERVER} ${control.deviceName()} ${1883}`)
    }

    // Block in Publish
    /**
     * Publish Message to MakerCloud
     * @param topic ,eg: "topic"
     * @param message ,eg: "message"
     */
    //% blockId=mc_kt_publish_message_to_topic
    //% block="publish to %topic about %message"
    //% group="Publish"
    //% weight=104
    export function publishToTopic(topic: string, message: string) {
        message = "_dsn=" + control.deviceSerialNumber() + ",_dn=" + control.deviceName() + "," + message
        serial.writeLine(`K53 ${topic} ${message}`)
        basic.pause(200) // limit user pub rate
    }

    /**
     * Publish Key and Message to MakerCloud
     * @param topic ,eg: "topic"
     * @param key ,eg: "key"
     * @param inText ,eg: "message"
     */
    //% blockId=mc_kt_publish_key_message_to_topic
    //% block="publish to %topic about %key = $inText"
    //% group="Publish"
    //% weight=103
    export function publishKeyMessageToTopic(topic: string, key: string, inText: string) {
        let message = "_dsn=" + control.deviceSerialNumber() + ",_dn=" + control.deviceName() + "," + key + "=" + inText
        serial.writeLine(`K53 ${topic} ${message}`)
        basic.pause(200) // limit user pub rate        
    }

    /**
     * Publish Key and Value to MakerCloud
     * @param topic ,eg: "topic"
     * @param key ,eg: "key"
     * @param value ,eg: "0"
    */
    //% blockId=mc_kt_publish_key_value_to_topic
    //% block="publish to %topic about %key = $value"
    //% group="Publish"
    //% weight=102
    export function publishKeyValueToTopic(topic: string, key: string, value: number) {
        let message = "_dsn=" + control.deviceSerialNumber() + ",_dn=" + control.deviceName() + "," + key + "=" + value
        serial.writeLine(`K53 ${topic} ${message}`)
        basic.pause(200) // limit user pub rate        
    }

    /**
     * Publish Location Coordinate to MakerCloud
     * @param topic ,eg: "topic"
     * @param lat ,eg: "latitude"
     * @param lng ,eg: "longitude"
    */
    //% blockId=mc_kt_publish_coordination_to_topic
    //% block="publish to %topic about %lat, $lng"
    //% group="Publish"
    //% weight=101
    export function publishCoordinationToTopic(topic: string, lat: string, lng: string) {
        let message = "_dsn=" + control.deviceSerialNumber() + ",_dn=" + control.deviceName() + ",lat=" + lat + ",lng=" + lng
        serial.writeLine(`K53 ${topic} ${message}`)
        basic.pause(200) // limit user pub rate        
    }

    /**
     * Subscribe MQTT topic
     * @param inTopics to inTopics ,eg: "topic"
     */
    //% blockId=mc_kt_subscribe_topic
    //% block="subscribe %topics"
    //% group="Subscribe"
    //% weight=104
    export function subscribeTopic(inTopics: string) {
        if (topics == null) {
            topics = splitMessage(inTopics, ",")
        } else {
            topics = topics.concat(splitMessage(inTopics, ","))
        }
        subscribeMQTT(inTopics)
    }

    /**
     * Listener for Message from MakerCloud
     * @param topic to topic ,eg: "topic"
     */
    //% blockId=mc_kt_register_topic_text_message_handler
    //% block="on MQTT %topic received"
    //% draggableParameters
    //% group="Subscribe"
    //% weight=103
    export function registerTopicMessageHandler(topic: string, fn: (receivedMessage: string) => void) {
        let topicHandler = new StringMessageHandler()
        topicHandler.fn = fn
        topicHandler.topicName = topic
        stringMessageHandlerList.push(topicHandler)
    }

    /**
     * Listener for Key and Message from MakerCloud
     * @param topic to topic ,eg: "topic"
     */
    //% blockId=mc_kt_register_topic_key_string_message_handler
    //% block="on MQTT %topic received"
    //% draggableParameters
    //% group="Subscribe"
    //% weight=102
    export function registerTopicKeyStringMessageHandler(topic: string, fn: (key: string, receivedMessage: string) => void) {
        let topicHandler = new KeyStringMessageHandler()
        topicHandler.fn = fn
        topicHandler.topicName = topic
        keyStringMessageHandlerList.push(topicHandler)
    }

    /**
     * Listener for Key and Value from MakerCloud
     * @param topic to topic ,eg: "topic"
     */
    //% blockId=mc_kt_register_topic_key_value_message_handler
    //% block="on MQTT %topic received"
    //% draggableParameters
    //% group="Subscribe"
    //% weight=101
    export function registerTopicKeyValueMessageHandler(topic: string, fn: (key: string, receivedValue: number) => void) {
        let topicHandler = new KeyValueMessageHandler()
        topicHandler.fn = fn
        topicHandler.topicName = topic
        keyValueMessageHandlerList.push(topicHandler)
    }

    function trim(n: string): string {
        while (n.charCodeAt(n.length - 1) < 0x1f) {
        n = n.slice(0, n.length - 1)
        }
        return n
    }

    serial.onDataReceived('\n', function () {
        let a = serial.readUntil('\n')
        if (a.charAt(0) == 'K') {
            a = trim(a)
            let b = a.slice(1, a.length).split(' ')
            let cmd = parseInt(b[0])
            control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 0x8900+cmd)

            if (cmd == 55 && b[2] != '') {
                let topic: string = b[2]
                let data: string = b[1]
                let makerCloudMessage = parseMakerCloudMessage(data);
                handleTopicStringMessage(topic, makerCloudMessage.stringMessageList);
                handleTopicKeyValueMessage(topic, makerCloudMessage.keyValueMessagList)
                handleTopicKeyStringMessage(topic, makerCloudMessage.keyStringMessageList)
            }
        }
    })

    function subscribeMQTT(inTopics: string) {
        // let topicList = splitMessage(topics, ",")
        serial.writeLine(`K52 ${inTopics}`)
        control.inBackground(function () {
            while(true){
                serial.writeLine(`K55 ${inTopics}`)
                basic.pause(2000)
            }
        })
        isSubscribe = true
    }

    function handleTopicStringMessage(topic: string, stringMessageList: string[]) {
        let i = 0
        for (i = 0; i < stringMessageHandlerList.length; i++) {
            if (stringMessageHandlerList[i].topicName == topic) {
                let j = 0;
                for (j = 0; j < stringMessageList.length; j++) {
                    stringMessageHandlerList[i].fn(stringMessageList[j]);
                }
                break
            }
        }
    }

    function handleTopicKeyStringMessage(topic: string, keyStringMessageList: KeyStringMessage[]) {
        let i = 0
        for (i = 0; i < keyStringMessageHandlerList.length; i++) {
            if (keyStringMessageHandlerList[i].topicName == topic) {
                let j = 0;
                for (j = 0; j < keyStringMessageList.length; j++) {
                    keyStringMessageHandlerList[i].fn(keyStringMessageList[j].key, keyStringMessageList[j].inText);
                }
                break
            }
        }
    }

    function handleTopicKeyValueMessage(topic: string, keyValueMessageList: KeyValueMessage[]) {
        let i = 0
        for (i = 0; i < keyValueMessageHandlerList.length; i++) {
            if (keyValueMessageHandlerList[i].topicName == topic) {
                let j = 0;
                for (j = 0; j < keyValueMessageList.length; j++) {
                    keyValueMessageHandlerList[i].fn(keyValueMessageList[j].key, keyValueMessageList[j].value);
                }
                break
            }
        }
    }

    function splitMessage(message: string, delimitor: string): string[] {
        let messages: string[] = [""];
        let i = 0;
        let messagesIndex = 0;

        for (i = 0; i < message.length; i++) {
            let letter: string = message.charAt(i)
            if (letter == delimitor) {
                messages[++messagesIndex] = ""
            } else {
                messages[messagesIndex] += letter
            }
        }
        return messages
    }

    export function parseMakerCloudMessage(topicMessage: string): MakerCloudMessage {
        let makerCloudMessage = new MakerCloudMessage();
        makerCloudMessage.rawMessage = topicMessage;
        makerCloudMessage.deviceName = "";
        makerCloudMessage.deviceSerialNumber = "";
        makerCloudMessage.keyValueMessagList = [];
        makerCloudMessage.keyStringMessageList = [];
        makerCloudMessage.stringMessageList = [];

        let delimitor = ",";
        let start = 0;
        let oldMessage: string = topicMessage;

        let i = 0;
        let total = countDelimitor(oldMessage, delimitor);
        for (i = 0; i <= total; i++) {
            let end = oldMessage.indexOf(delimitor);
            if (end == -1) {
                end = oldMessage.length
            }
            let subMessage = oldMessage.substr(0, end);
            if (subMessage.indexOf("=") == -1) {
                makerCloudMessage.stringMessageList[makerCloudMessage.stringMessageList.length] = subMessage
            } else {
                let splitIndex = subMessage.indexOf("=");
                let key = subMessage.substr(0, splitIndex);
                let value = subMessage.substr(splitIndex + 1)

                if (value.length > 0) {
                    if (key == "_dsn") {
                        makerCloudMessage.deviceSerialNumber = value;
                    } else if (key == "_dn") {
                        makerCloudMessage.deviceName = value;
                    } else {
                        if (parseFloat(value) || value == "0") {
                            let keyValue = new KeyValueMessage();
                            keyValue.key = key;
                            keyValue.value = parseFloat(value);
                            makerCloudMessage.keyValueMessagList[makerCloudMessage.keyValueMessagList.length] = keyValue;
                        } else {
                            let keyString = new KeyStringMessage();
                            keyString.key = key;
                            keyString.inText = value;
                            makerCloudMessage.keyStringMessageList[makerCloudMessage.keyValueMessagList.length] = keyString;
                        }
                    }
                }
            }
            oldMessage = oldMessage.substr(end + 1, oldMessage.length);
        }

        return makerCloudMessage;
    }

    export function countDelimitor(msg: string, delimitor: string): number {
        let count: number = 0;
        let i = 0;
        for (i = 0; i < msg.length; i++) {
            if (msg.charAt(i) == delimitor) {
                count++;
            }
        }
        return count;
    }

    function splitMessageOnFirstDelimitor(message: string, delimitor: string): string[] {
        let beforeDelimitor = ""
        let afterDelimitor = ""
        let i = 0
        let delimitorPassed = false
        for (i = 0; i < message.length; i++) {
            let letter: string = message.charAt(i)

            if (letter == delimitor) {
                delimitorPassed = true
                continue
            }

            if (delimitorPassed) {
                afterDelimitor += letter
            } else {
                beforeDelimitor += letter
            }
        }
        return [beforeDelimitor, afterDelimitor];
    }
}

