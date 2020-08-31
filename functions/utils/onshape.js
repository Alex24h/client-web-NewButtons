const admin = require('firebase-admin')
const createMessageUtils = require('./createMessage')
const cryptoUtils = require('./crypto')
var crypto = require('crypto')
var request = require('request-promise')
const functions = require('firebase-functions')
var u = require('url')
const emailUtils = require('../utils/email')

module.exports = {

  joinPERRINNOnshapeTeam:(email)=>{
    var email=email
    var method='POST'
    var url='https://cad.onshape.com/api/teams/559f8b25e4b056aae06c1b1d/members'
    var body={'email':email,'admin':false}
    const accessKey=functions.config().onshape.accesskey
    const secretKey=functions.config().onshape.secretkey
    var urlObj = u.parse(url)
    var urlPath = urlObj.pathname
    var urlQuery = urlObj.query ? urlObj.query : '' // if no query, use empty string
    var authDate = (new Date()).toUTCString()
    var nonce = cryptoUtils.buildNonce()
    var contentType = 'application/json'
    var str = (method + '\n' + nonce + '\n' + authDate + '\n' + contentType + '\n' +
        urlPath + '\n' + urlQuery + '\n').toLowerCase()
    var hmac = crypto.createHmac('sha256', secretKey)
        .update(str)
        .digest('base64')
    var signature = 'On ' + accessKey + ':HmacSHA256:' + hmac
    //require('request').debug = true
    return request({
      uri: url,
      method:method,
      headers: {
        'Method':method,
        'Content-type':contentType,
        'Accept':'application/vnd.onshape.v1+json',
        'Authorization':signature,
        'Date':authDate,
        'On-Nonce':nonce
      },
      json: true,
      body: body
    }).catch(error=>{
      console.log('email '+email+' error '+error)
      return
    })
  },

  getPERRINNOnshapeTeam:()=>{
    var method='GET'
    var url='https://cad.onshape.com/api/teams/559f8b25e4b056aae06c1b1d/members'
    const accessKey=functions.config().onshape.accesskey
    const secretKey=functions.config().onshape.secretkey
    var urlObj = u.parse(url)
    var urlPath = urlObj.pathname
    var urlQuery = urlObj.query ? urlObj.query : '' // if no query, use empty string
    var authDate = (new Date()).toUTCString()
    var nonce = cryptoUtils.buildNonce()
    var contentType = 'application/json'
    var str = (method + '\n' + nonce + '\n' + authDate + '\n' + contentType + '\n' +
        urlPath + '\n' + urlQuery + '\n').toLowerCase()
    var hmac = crypto.createHmac('sha256', secretKey)
        .update(str)
        .digest('base64')
    var signature = 'On ' + accessKey + ':HmacSHA256:' + hmac
    //require('request').debug = true
    return request({
      uri: url,
      method:method,
      headers: {
        'Method':method,
        'Content-type':contentType,
        'Accept':'application/vnd.onshape.v1+json',
        'Authorization':signature,
        'Date':authDate,
        'On-Nonce':nonce
      },
      json: true
    }).catch(error=>{
      console.log('Onshape get error '+error)
      return
    })
  },

}
