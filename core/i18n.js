/**
 * @author      Created by Marcus Spiegel <marcus.spiegel@gmail.com> on 2011-03-25.
 * @link        https://github.com/mashpie/i18n-node
 * @license		http://creativecommons.org/licenses/by-sa/3.0/
 *
 * @version     0.3.0
 */

// dependencies

var vsprintf = require('sprintf').vsprintf, // 0.1.1
    fs = require('fs'),
    path = require('path'),
    
// defaults
    
    locales = {},
    localesNames = {},
    defaultLocale = '',
    currentLocale = '',
    directory = './locales';

// public exports

var i18n = exports;

i18n.version = '0.3.0';

i18n.configure = function(opt){
	//console.log("i18n.configure");
	defaultLocale = opt.defaultLocale;
	currentLocale = defaultLocale;
    if( typeof opt.locales === 'object' ){
		//mi tengo una copia dei locales che mi arrivano durante il configure
		localesNames = opt.locales;
        opt.locales.forEach(function(l){
            read(l);
        });
    }
    
    // you may register helpers in global scope, up to you
    if( typeof opt.register === 'object' ){
        opt.register.__ = i18n.__;
        opt.register.__n = i18n.__n;
    }
}

i18n.t = function(req,msg) {
	//se ho il locale nei cookies ha la precedenza, altrimenti vale il currentLocale
	if ( req.cookies != undefined )
	{
		i18n.setLocale( req.cookies.currentlocale );
	}
    return translate(msg);
}

i18n.__ = function() {
	//console.log("req:"+app);
	/*
	for ( var x=0; x<arguments.length;x++) 
	{
		console.log("argument:"+arguments[x]);
	}
	*/
	
	/*
	console.log("args num: "+arguments.length);
	console.log("arguments[0]: "+arguments[0]);
	for ( arg in arguments )
	{
		console.log("arg="+arg);
		for ( prop in arg )
		{
			console.log("prop="+arg);
		}
	}
	*/
    var msg = translate(arguments[0]);
    if (arguments.length > 1) {
        msg = vsprintf(msg, Array.prototype.slice.call(arguments, 1));
    }
    return msg;
};

i18n.__n = function() {
    var singular = arguments[0];
    var plural = arguments[1];
    var count = arguments[2];
    var msg = translate(singular, plural);

    if (parseInt(count) > 1) {
        msg = vsprintf(msg.other, [count]);
    } else {
        msg = vsprintf(msg.one, [count]);
    }

    if (arguments.length > 3) {
        msg = vsprintf(msg, Array.prototype.slice.call(arguments, 3));
    }

    return msg;
};


//a questa posso passare le session, perchè la richiamo dall'app
i18n.setLocale = function() {
	//console.log("i18n.setLocale con arguments[0]="+arguments[0]);
    if (locales[arguments[0]]) {
        currentLocale = arguments[0];
    }
	//console.log(i18n.getLocale());
    return i18n.getLocale();
};

i18n.getLocale = function() {
    return currentLocale;
};

i18n.getLocalesNames = function() {
	//console.log(localesNames);
    return localesNames;
};

i18n.init = function(req, res, next) { 
	//se le session dell'utente non hanno ancora una lingua definita, provo a leggerla da quella di dafult del browser
	if ( req.cookies && req.cookies.currentlocale ) 
	{
		//se nelle session c'è la lingua scelta dall'utente, quella ha la precedenza
		//imposto la mia variabile locale in base alle session
		i18n.setLocale(req.cookies.currentlocale);
	}
	else
	{
		//altrimenti provo ad indovinarla dagli header del browser usato
		//req.cookies.currentlocale = defaultLocale;
		i18n.setLocale( guessLanguage(req) );
	}
	
	
	//console.log("i18n.init: req.cookies.currentlocale = "+req.cookies.currentlocale);
	/*
    if( typeof request === 'object' ){
        guessLanguage(request);
    }
    if( typeof next === 'function' ){
        next();
    }
	*/
	
	
	next();
};




// ===================
// = private methods =
// ===================


// read currentLocale file, translate a msg and write to fs if new
//QUI!!! metodo che usa currentLocale globale
function translate(singular, plural) {
    if (!locales[currentLocale]) {
        read(currentLocale);
    }

    if (plural) {
        if (!locales[currentLocale][singular]) {
            locales[currentLocale][singular] = {
                'one': singular,
                'other': plural
            };
            write(currentLocale);
        }
    }

    if (!locales[currentLocale][singular]) {
        locales[currentLocale][singular] = singular;
        write(currentLocale);
    }
    return locales[currentLocale][singular];
}

// try reading a file
function read(myLocale) {
    locales[myLocale] = {};
    try {
        locales[myLocale] = JSON.parse(fs.readFileSync(locate(myLocale)));
    } catch(e) {
        console.log('initializing ' + locate(myLocale));
        write(myLocale);
    }
}

// try writing a file in a created directory
function write(myLocale) {
    try {
        stats = fs.lstatSync(directory);
    } catch(e) {
        fs.mkdirSync(directory, 0755);
    }
    fs.writeFile(locate(myLocale), JSON.stringify(locales[myLocale], null, "\t"));
}

// basic normalization of filepath
function locate(myLocale) {
    return path.normalize(directory + '/' + myLocale + '.js');
}




// guess language setting based on http headers
function guessLanguage(request){
	//console.log("guessLanguage");
    if(typeof request === 'object'){
        var language_header = request.headers['accept-language'],
        languages = [];
        regions = [];
        request.languages = [currentLocale];
		/*
		for (x in request.languages)
		{
			console.log(request.languages[x] + x);
		}
		*/
        request.regions = [currentLocale];
        request.language = currentLocale;
        request.region = currentLocale;

        if (language_header) {
            language_header.split(',').forEach(function(l) {
                header = l.split(';', 1)[0];
                lr = header.split('-', 2);
                if (lr[0]) {
                    languages.push(lr[0].toLowerCase());
                }
                if (lr[1]) {
                    regions.push(lr[1].toLowerCase());
                }
            });

            if (languages.length > 0) {
                request.languages = languages;
                request.language = languages[0];
            }

            if (regions.length > 0) {
                request.regions = regions;
                request.region = regions[0];
            }
        }
        i18n.setLocale(request.language);
    }
}

