/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core');
const request = require('request');

class Youtube extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: 'youtube',
        });

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    getChannelData(id, cpath) {
        // Documentation: https://developers.google.com/youtube/v3/docs/channels

        const self = this;
        const apiKey = this.config.apiKey;
        const enableVideoInformation = this.config.enableVideoInformation;

        this.log.debug('youtube/v3/channels - Request init - ' + id);

        this.setObjectNotExists(cpath + '.lastUpdate', {
            type: 'state',
            common: {
                name: 'Last Update',
                type: 'string',
                role: 'value.datetime',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.statistics', {
            type: 'channel',
            common: {
                name: 'Statistics'
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.statistics.viewCount', {
            type: 'state',
            common: {
                name: 'View Count',
                type: 'number',
                role: 'value',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.statistics.subscriberCount', {
            type: 'state',
            common: {
                name: 'Subscriber Count',
                type: 'number',
                role: 'value',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.statistics.videoCount', {
            type: 'state',
            common: {
                name: 'Video Count',
                type: 'number',
                role: 'value',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.snippet', {
            type: 'channel',
            common: {
                name: 'Snippet'
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.snippet.title', {
            type: 'state',
            common: {
                name: 'Channel Title',
                type: 'string',
                role: 'value',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.snippet.description', {
            type: 'state',
            common: {
                name: 'Channel Description',
                type: 'string',
                role: 'value',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.snippet.customUrl', {
            type: 'state',
            common: {
                name: 'Channel Custom Url',
                type: 'string',
                role: 'value',
                read: true,
                write: false
            },
            native: {}
        });

        this.setObjectNotExists(cpath + '.snippet.publishedAt', {
            type: 'state',
            common: {
                name: 'Channel Publish Date',
                type: 'string',
                role: 'value.datetime',
                read: true,
                write: false
            },
            native: {}
        });

        if (apiKey) {
            request(
                {
                    url: 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=' + id + '&key=' + apiKey,
                    json: true,
                    timeout: 4500
                },
                (error, response, content) => {
                    self.log.debug('youtube/v3/channels - Request done - ' + id);
                    self.log.debug('received data (' + response.statusCode + '): ' + JSON.stringify(content));

                    if (!error && response.statusCode == 200) {

                        if (content && Object.prototype.hasOwnProperty.call(content, 'items') && Array.isArray(content['items']) && content['items'].length > 0) {
                            const firstItem = content['items'][0];

                            if (Object.prototype.hasOwnProperty.call(firstItem, 'statistics')) {
                                self.setState(cpath + '.statistics.viewCount', {val: firstItem.statistics.viewCount, ack: true});
                                self.setState(cpath + '.statistics.subscriberCount', {val: firstItem.statistics.subscriberCount, ack: true});
                                self.setState(cpath + '.statistics.videoCount', {val: firstItem.statistics.videoCount, ack: true});
                            }

                            if (Object.prototype.hasOwnProperty.call(firstItem, 'snippet')) {
                                self.setState(cpath + '.snippet.title', {val: firstItem.snippet.title, ack: true});
                                self.setState(cpath + '.snippet.description', {val: firstItem.snippet.description, ack: true});
                                self.setState(cpath + '.snippet.customUrl', {val: firstItem.snippet.customUrl, ack: true});
                                self.setState(cpath + '.snippet.publishedAt', {val: firstItem.snippet.publishedAt, ack: true});
                            }

                            const updateTime = new Date();
                            this.setState(cpath + '.lastUpdate', {val: new Date(updateTime - updateTime.getTimezoneOffset() * 60000).toISOString(), ack: true});
                        } else {
                            self.log.warn('youtube/v3/channels - received empty response - check channel id');
                        }

                    } else if (error) {
                        self.log.warn(error);
                    } else {
                        self.log.error('youtube/v3/channels - Status Code: ' + response.statusCode + ' / Content: ' + JSON.stringify(content));
                    }
                }
            );

            if (enableVideoInformation) {
                // Fill latest video information
                request(
                    {
                        url: 'https://www.googleapis.com/youtube/v3/search?part=id,snippet&type=video&order=date&maxResults=5&channelId=' + id + '&key=' + apiKey,
                        json: true,
                        timeout: 4500
                    },
                    (error, response, content) => {
                        self.log.debug('youtube/v3/search Request done');
                        self.log.debug('received data (' + response.statusCode + '): ' + JSON.stringify(content));

                        if (!error && response.statusCode == 200) {
    
                            if (content && Object.prototype.hasOwnProperty.call(content, 'items') && Array.isArray(content['items']) && content['items'].length > 0) {
                                for (let i = 0; i < content['items'].length; i++) {

                                    const v = content['items'][i];
                                    const path = cpath + '.video.' + i + '.';

                                    self.setObjectNotExists(path, {
                                        type: 'channel',
                                        common: {
                                            name: 'Video data ' + (i + 1)
                                        },
                                        native: {}
                                    });

                                    self.setObjectNotExists(path + 'id', {
                                        type: 'state',
                                        common: {
                                            name: 'Id',
                                            type: 'string',
                                            role: 'media.playid',
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    self.setState(path + 'id', {val: v.id.videoId, ack: true});

                                    self.setObjectNotExists(path + 'url', {
                                        type: 'state',
                                        common: {
                                            name: 'URL',
                                            type: 'string',
                                            role: 'url.blank',
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    self.setState(path + 'url', {val: 'https://youtu.be/' + v.id.videoId, ack: true});

                                    self.setObjectNotExists(path + 'title', {
                                        type: 'state',
                                        common: {
                                            name: 'Title',
                                            type: 'string',
                                            role: 'media.title',
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    self.setState(path + 'title', {val: v.snippet.title, ack: true});

                                    self.setObjectNotExists(path + 'published', {
                                        type: 'state',
                                        common: {
                                            name: 'Published',
                                            type: 'string',
                                            role: 'media.date',
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    self.setState(path + 'published', {val: v.snippet.publishedAt, ack: true});

                                    self.setObjectNotExists(path + 'description', {
                                        type: 'state',
                                        common: {
                                            name: 'Description',
                                            type: 'string',
                                            role: 'state',
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    self.setState(path + 'description', {val: v.snippet.description, ack: true});
                                }
                            } else {
                                self.log.warn('youtube/v3/search - received empty response - check channel id');
                            }
                        } else if (error) {
                            self.log.warn(error);
                        } else {
                            self.log.error('youtube/v3/search - Status Code: ' + response.statusCode + ' / Content: ' + JSON.stringify(content));
                        }
                    }
                );
            }
        }
    }

    async onReady() {
        const channels = this.config.channels;

        if (channels && Array.isArray(channels)) {
            this.log.debug('Found other channels, fetching data');

            for (const c in channels) {
                const channel = channels[c];
                const cleanChannelName = channel.name.replace(/\s/g,'');

                this.setObjectNotExists('channels.' + cleanChannelName, {
                    type: 'channel',
                    common: {
                        name: channel.name
                    },
                    native: {}
                });

                this.getChannelData(channel.id, 'channels.' + cleanChannelName);
            }

            setTimeout(this.stop.bind(this), 30000);
        }
    }

    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Youtube(options);
} else {
    // otherwise start the instance directly
    new Youtube();
}