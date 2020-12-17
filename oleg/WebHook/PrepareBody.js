const {workerData, parentPort} = require('worker_threads');
let mongodb = require('mongodb');

const set = require('lodash/set');
const get = require('lodash/get');
const moment = require('moment');
const mongodbService = require('../Mongodb');


// Должно быть последним
let ConfigInit = require('../ConfigInit');
ConfigInit.start(workerData.program);
ConfigInit.mysql_connect();
let _QueryWebHook = require('./QueryWebHook');

/**
 * @var global object
 */

class PrepareBody {
    /**
     * Ошибка
     * @param text
     * @param err
     * @param err1
     */
    error(text, err = null, err1 = null) {
        this.date_error = new Date();
        console.error(this.date_error.toLocaleString() + ' | PrepareBody | ' + text, err, err1);
    }

    /**
     * Warning
     */
    warning(text, dump = null) {
        this.date_warning = new Date();
        console.log(this.date_warning.toLocaleString() + ' | Warning | PrepareBody | ' + text + (dump ? JSON.stringify(dump) : ''));
    }

    /**
     * Информация
     */
    info(text) {
        this.date_info = new Date();
        console.log(this.date_info.toLocaleString() + ' | Info | PrepareBody | ', arguments);
    }

    /**
     * Получение подписчиков шага
     * @returns {Promise}
     */
    get_lead() {
        return new Promise((resolve) => {
            if (global.mongo) {
                // console.log(
                //     'group_id', parseInt(query['lead']['group_id']),
                //     'vk_user_id', parseInt(query['lead']['vk_user_id'])
                // );
                console.log('PREPARE lead find',{group_id: this.group_id,
                    vk_user_id: this.vk_user_id});
                global.mongo.collection('leads').findOne({
                    group_id: this.group_id,
                    vk_user_id: this.vk_user_id,
                }, (err, lead) => {
                    if (err) {
                        this.error('PREPARE query_lead  lead', err);
                    } else {
                       // console.log('PREPARE lead find',lead);
                        resolve(lead);
                    }
                })
            }
        });
    }

    user_vars(value, obj) {
        let result = '';

        switch (value) {
            case 'identification_user_vk':
                result = obj.vk_user_id;
                break;
            case 'b_date':
                result = moment(obj.bdate).format('YYYY-MM-D HH:mm:ss');
                break;
            case 'b_day':
                result = moment(obj.bdate).format('D.MM');
                break;
            case 'array_subscribers':
                result = obj.subscriptions;
                break;
            case 'id_country':
                result = obj.country_id;
                break;
            case 'id_city':
                result = obj.city_id;
                break;
            case 'sex':
                result = obj.sex;
                break;
            case 'icon_user':
                result = obj.photo;
                break;
            case 'first_subscriber':
                result = moment(obj.date).format('YYYY-MM-D HH:mm:ss');
                break;
            case 'array_utms':
                result = obj.utms;
                break;
            default:
                result = obj[value];
        }

        return result;
    }

    identification_group_vk(value, obj) {
        return obj.group_id;
    }

    action(value, obj) {
        let result = '';

        switch (value) {
            case 'type':
                result = obj.type;
                break;
            case 'first_subscriber':
                result = '';
                break;
            case 'unsubscribe':
                result = '';
                break;
            case 'subscriber_group':
                result = obj.object.vk_group_id;
                break;
            case 'date_action':
                result = obj.object.date;
                break;
            case 'source_action':
                result = obj.object.source;
                break;
            case 'id_utms':
                result = obj.object.utm_id;
                break;
            case 'icon_user':
                result = obj.photo;
                break;
            case 'first_subscriber':
                result = moment(obj.date).format('YYYY-MM-D HH:mm:ss');
                break;
            case 'utm_source':
                result = obj.object.utm_source;
                break;
            case 'utm_medium':
                result = obj.object.utm_medium;
                break;
            case 'utm_campaign':
                result = obj.object.utm_campaign;
                break;
            case 'utm_content':
                result = obj.object.utm_content;
                break;
            case 'utm_term':
                result = obj.object.utm_term;
                break;
            default:
                result = obj[value];
        }

        return result;
    }

    global_vars(value, obj) {
        const globVar = mongodbService.find('glob_vars', {n: value});

        return globVar[0].v;
    }

    static(value, obj) {
        return value;
    }

    getPath(obj, name, val, currentPath) {
        currentPath = currentPath || ''

        let matchingPath

        if (!obj || typeof obj !== 'object') return

        if (obj[name] === val) return `${currentPath}${currentPath !== '' ? '.' : ''}${name}`


        for (const key of Object.keys(obj)) {
            if (key === name && obj[key] === val) {
                matchingPath = currentPath
            } else {
                matchingPath = this.getPath(obj[key], name, val, `${currentPath}${currentPath !== '' ? '.' : ''}${key}`)
            }

            if (matchingPath) break
        }

        return matchingPath
    }



    /**
     * Проверка связей шага
     */
    prepare_body() {
         return new Promise((resolve) => {

            let body = this.template.body;
            let lead = this.lead;

            body = JSON.parse(body);

            const listVars = {
                static: 'static',
                user_vars: 'user_vars',
                global_vars: 'global_vars',
                identification_group_vk: 'identification_group_vk',
                action: 'action',
                array: 'array',
                object: 'object'
            };

            Object.keys(listVars).map(type => {
                let path = this.getPath(body, "type", type);
                do {
                    path = this.getPath(body, "type", type);
                    if (path === undefined) {
                        break;
                    }
                    path = path
                        .split('.')
                        .slice(0, -1)
                        .join('.');

                    let value = get(body, path, undefined);
                    if (value === undefined) {
                        path = path
                            .split('.')
                            .slice(1)
                            .join('.');
                        value = get(body, path, undefined);
                    }

                    set(body, path, this[type](value.value, lead));
                } while (path !== undefined)
            });

            this.arr.body = JSON.stringify(body);

            resolve();
        }).catch((err)=>{
            console.log(err);
        });

    }

    begin(callback) {
        console.log('PREPARE prepare body begin');

        this.QueryWebHook.getWebhookTemplate(this.template_id).then((template) => {

            this.template = template;
            return this.get_lead()

        }).then((lead) => {
            this.lead = lead;
            return this.prepare_body();
        }).then(() => {
            callback(this.arr);

        }).catch((err) => {
            this.arr.status = 'error';

            if (typeof (err) === 'string')
                this.arr.message = err;
            else if (err.message) {
                this.arr.message = err.message;
                this.warning(`.run`, err);
            }

            callback(this.arr);
        });


    }


    /**
     * Создание класса
     * @param {string} webhook_id
     * @param {string} template_id
     * @param {int} group_id
     * @param {int} vk_user_id
     */
    constructor(template_id, group_id, vk_user_id) {

        this.date_error = null;
        this.date_info = null;


      //  this.webhook_id = webhook_id;
        this.group_id = parseInt(group_id + '');
        this.vk_user_id = parseInt(vk_user_id + '');
        this.template_id = template_id;



        this.lead = null;

        this.QueryWebHook = new _QueryWebHook(this);

        this.arr = {
            status: 'ok',
            body: ''
        };
    }
}

ConfigInit.mongodb_connect(() => {

    let _PrepareBody = new PrepareBody( workerData.template_id, workerData.group_id, workerData.vk_user_id);
    _PrepareBody.begin((arr) => {
        parentPort.postMessage({
            type: 'body',
            arr: arr
        });
    });
});