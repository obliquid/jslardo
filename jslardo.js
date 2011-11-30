// jslardo functions


//SESSIONS
/* controllo nel db se lo user (che sia in POST o dalle sessions) esiste */
function checkValidUser(req, closure)
{
	//console.log('checkValidUser: req.body.login_email='+req.body.login_email);
	//console.log('checkValidUser: req.session.email='+req.session.email);
	//controllo se ho le credenziali in POST (cioè se sto facendo un login dal form), oppure se le ho nelle session (sono già loggato)
	var email = ( req.body && req.body.login_email && req.body.login_email != "" ) ? req.body.login_email : req.session.email;
	var password = ( req.body && req.body.login_password && req.body.login_password != "" ) ? req.body.login_password : req.session.password;
	/*
	if ( req.session && req.session.email && req.session.email != "" ) 
	{
		console.log('checkValidUser: req.session.email='+req.session.email);
	}
	if ( req.body && req.body.login_email && req.body.login_email != "" ) 
	{
		console.log('checkValidUser: req.body.login_email='+req.body.login_email);
		
	}
	if ( req.body && req.body.password && req.body.password != "" ) console.log('checkValidUser: req.body.password='+req.body.password);
	if ( req.session && req.session.password && req.session.password != "" ) console.log('checkValidUser: req.session.password='+req.session.password);
	console.log('checkValidUser: email='+email);
	console.log('checkValidUser: password='+password);
	*/
	
	
	
	/*
	console.log(req.app.jslardo);
	console.log(req.app.jslardo.config);
	console.log(req.app.jslardo.config.superadminEmail);
	*/
	//prima controllo se si tratta del super admin
	if ( req.app.jslardo.config.superadminEmail == email && req.app.jslardo.config.superadminPw == password )
	{
		closure(true, 'superadmin'); //se sono super user, salvo come id la parola "superadmin"
	}
	else
	{
		//verifico se effettivamente esiste nel db il mio utente
		var hashedPw = hashPw(req, password);
		//console.log("checkValidUser: hashedPw="+hashedPw);
		req.app.jslardo.user.findOne(
			{ 'email': email, 'password': hashedPw },
			function(err, user) {
				if (!err)
				{
					if ( user && user.email == email && user.password == hashedPw )
					{
						//return true;
						closure(true, user._id);
					}
					else
					{
						//return false;
						closure(false, 0);
					}
				}
				else
				{
					//qualcosa è andato storto nella query
					errorPage(res, err, 'jslardo.checkValidUser: ');
				}
			}
		);		
	}
}

/* dopo che è stato effettuato il controllo, questo metodo salva effettivamente le variabili che dicono che l'utente è loggato */
function setSignedIn(req, user_id)
{
	//console.log(req);
	//console.log(user_id);
	/*
	console.log('setSignedIn: req.body.email='+req.body.email);
	console.log('setSignedIn: req.body.password='+req.body.password);
	console.log('setSignedIn: req.body.login_email='+req.body.login_email);
	console.log('setSignedIn: req.body.login_password='+req.body.login_password);
	*/
	
	//devo considerare i casi in cui i dati arrivano dal form di login, e il caso in cui arrivano dal form di modifica dell'utente
	if ( req.body && req.body.login_email && req.body.login_email != "" ) 
	{
		var email = req.body.login_email;
	}
	else if ( req.body && req.body.email && req.body.email != "" ) 
	{
		var email = req.body.email;
	}
	if ( req.body && req.body.login_password && req.body.login_password != "" ) 
	{
		var password = req.body.login_password;
	}
	else if ( req.body && req.body.password && req.body.password != "" ) 
	{
		var password = req.body.password;
	}
	//console.log('setSignedIn: email='+email);
	//console.log('setSignedIn: password='+password);
	
	//salvo nelle session che il mio utente è loggato
	req.session.email = email;
	req.session.password = password;
	req.session.user_id = user_id;
	//non più usato, al suo posto controllo user_id: req.session.signedin = true;
}

/* slogga l'utente */
function setSignedOut(req)
{
	//resetto le session
	req.session.destroy(function() {});
}

function hashPw(req, password)
{
	return req.app.jslardo.crypto.createHash('sha1').update(password).digest('hex');
}



//PAGINATION
function paginationInit(req, res, next) {
	//numero di pagina corrente
	req.session.pageNum = parseInt(req.params.page) || 1;
	//skip
	req.session.skip = req.app.jslardo.config.elementsPerPage * ( req.session.pageNum - 1 );
	//limit
	req.session.limit = req.app.jslardo.config.elementsPerPage;
	//la request puo essere processata
	next();

}
function paginationDo(req, total, url) {
	//actual range
	var recordsPerPage = req.app.jslardo.config.elementsPerPage;
	var endToRecord = req.session.pageNum * recordsPerPage;
	if( endToRecord > total )
	{
		endToRecord = total;
	}
	var endFromRecord = ((req.session.pageNum-1) * recordsPerPage) +1;
	if ( total > recordsPerPage )
	{
		var currentRangeString = endFromRecord+" - "+endToRecord+" ( tot. "+total+" )";
	}
	//first range - first page link
	if (req.session.pageNum > 1)
	{
		var firstRangeString = "1 - "+recordsPerPage+" ( tot. "+total+" )";
	}
	// prev 10 pages link
	if (req.session.pageNum > 10)
	{
		var prev10LinkPage = req.session.pageNum - 10;
		var prev10RangeFromRecord = ((req.session.pageNum-11) * recordsPerPage) +1;
		var prev10RangeToRecord = ((req.session.pageNum-10) * recordsPerPage);
		var prev10RangeString = prev10RangeFromRecord+" - "+prev10RangeToRecord+" ( tot. "+total+" )";
	}
	//prev page link
	if (req.session.pageNum > 1)
	{
		var prevLinkPage = req.session.pageNum - 1;
		var prevRangeFromRecord = ((req.session.pageNum-2) * recordsPerPage) +1;
		var prevRangeToRecord = ((req.session.pageNum-1) * recordsPerPage);
		var prevRangeString = prevRangeFromRecord+" - "+prevRangeToRecord+" ( tot. "+total+" )";
	}
	//next page link
	var nextTempVar = (recordsPerPage * req.session.pageNum)+1;
	if (nextTempVar <= total)
	{
		var nextLinkPage = req.session.pageNum + 1;
		var nextRangeFromRecord = (req.session.pageNum * recordsPerPage) +1;
		var nextRangeToRecord = ((req.session.pageNum+1) * recordsPerPage);
		if ( nextRangeToRecord > total)
		{
			 nextRangeToRecord = total;
		}
		var nextRangeString = nextRangeFromRecord+" - "+nextRangeToRecord+" ( tot. "+total+" )";
	}
	//next 10 pages link
	var next10TempVar = (recordsPerPage * (req.session.pageNum + 9)) + 1;
	if (next10TempVar <= total)
	{
		var next10LinkPage = req.session.pageNum + 10;
		var next10RangeFromRecord = (( req.session.pageNum + 9 ) * recordsPerPage) + 1;
		var next10RangeToRecord = ((req.session.pageNum + 10) * recordsPerPage);
		if ( next10RangeToRecord > total)
		{
			 next10RangeToRecord = total;
		}
		var next10RangeString = next10RangeFromRecord+" - "+next10RangeToRecord+" ( tot. "+total+" )";
	}
	//last page link
	if (req.session.pageNum < Math.floor(( total - 1 )/recordsPerPage)+1)
	{
		var lastLinkPage = Math.floor(( total - 1 )/recordsPerPage)+1;
		var lastRangeFromRecord = Math.floor(( total-1 ) / recordsPerPage);
		var lastRangeFromRecord = (lastRangeFromRecord * recordsPerPage) +1;
		var lastRangeToRecord = total;
		var lastRangeString = lastRangeFromRecord+" - "+lastRangeToRecord+" ( tot. "+total+" )";
	}
	return {
		firstBtn: { link:url+'1', tooltip:firstRangeString},
		prev10Btn: { link:url+prev10LinkPage, tooltip:prev10RangeString},
		prevBtn: { link:url+prevLinkPage, tooltip:prevRangeString},
		currentLabel: { link:url+req.session.pageNum, tooltip:currentRangeString},
		nextBtn: { link:url+nextLinkPage, tooltip:nextRangeString},
		next10Btn: { link:url+next10LinkPage, tooltip:next10RangeString},
		lastBtn: { link:url+lastLinkPage, tooltip:lastRangeString}
	}
}
	
	
//PERMISSIONS
//questo metodo viene richiamato prima di eseguire ogni request che lo richiede
//in qualunque controller di qualunque oggetto
function checkPermissions(req, res, next) {
	//console.log('checkPermissions: req.session.user_id = ' + req.session.user_id);
	//controllo i permessi
	if (req.session.user_id) {
		//l'utente risulta loggato
		//console.log('checkPermissions: utente loggato');
		//controllo se i suoi dati di login sono validi
		checkValidUser(req, function(result, user_id) { 
			if ( result )
			{
				//i dati di login sono validi
				//console.log('checkPermissions: i dati di login sono validi: user_id='+user_id);
				if ( user_id == 'superadmin' )
				{
					//console.log('checkPermissions: sono superadmin');
					//se sono super admin, ho sempre permesso di modify
					req.session.hasModify = true; //questo perloppiù lo uso nei template
					//la request puo essere processata
					next();
				}
				else
				{
					//non sono superadmin
					//nel caso di modifica di users, ho modify solo per modificare me stesso
					//console.log(req);
					//console.log(req.url);
					//console.log(req.originalUrl);
					//console.log(req.app.jslardo);
					if ( req.params.id == req.session.user_id ) //questo controllo funziona perchè gli id di mongo sono sempre unici, indipendentemente dalla collection????????????????
					{
						//console.log('checkPermissions: NON sono superadmin, modifico me stesso');
						//lo user id nella route richiesta corrisponde al mio, quindi posso modificare me stesso (il mio profilo)
						req.session.hasModify = true; 
						//la request puo essere processata
						next();
					}
					else
					{
						//console.log('checkPermissions: NON sono superadmin e NON modifico me stesso, vado in home');
						//vengo mandato in home
						res.redirect('/');
					}
				}
			}
			else
			{
				//i dati di login non sono validi
				//console.log('checkPermissions: login NON valido');
				//forzo un logout (potrebbe verificarsi il caso in cui un utente è loggato, e viene cancellato dal db. in quel caso deve avvenire anche ilsuo logout)
				setSignedOut(req);
				//vengo mandato in home
				res.redirect('/');
			}
		});
		
	} else {
		//console.log('checkPermissions: utente non loggato');			
		//se l'utente non è loggato, lo rimando nella home
		res.redirect('/');
	}
}



// VARIE

/* visualizza una pagina di errore e logga sulla console */
function errorPage(res, errMsg, publicMsg) {
	console.log(errMsg);
	res.render('error', { 
		errMsg: errMsg,
		publicMsg: publicMsg
	});			
}

/* carica le routes per le pagine interne di jslardo */
function defineRoutes(app) {
	
	//GET: home
	app.get('/', function(req, res){ 
		res.render('home', {
		});
	});

	//POST: login signin
	app.post('/signin', function(req, res) {
		//controllo se esiste il mio utente nel db
		checkValidUser(req, function(result, user_id) { 
			if ( result )
			{
				//ho trovato lo user nel db
				//il login è valido
				setSignedIn(req, user_id);
				console.log("POST: login signin: login succeded for user: "+req.body.login_email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
			else
			{
				//il mio utente non c'è nel db
				setSignedOut(req);
				console.log("POST: login signin: login failed for user: "+req.body.login_email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
		});	
	});
	
	//GET: login signout
	app.get('/signout', function(req, res) {
		//resetto le session
		console.log("POST: login signout: for user: "+req.session.email);
		req.session.destroy(function() {});
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
	//GET: change language
	app.get('/lan/:locale?', function(req, res) {
		//cambio la lingua
		//console.log("cambierei con: "+req.params.locale);
		req.app.i18n.setLocale(req.params.locale);
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
	
	
}

/* carica la route di default da usare quando nessuna altra route è stata matchata */
//non va
function defineRoute404(app) {
	/*
	app.get('*', function(req, res){
		errorPage(res, "404 not found: "+req.path);	
	});	
	*/
}

/*
questa serve quando mi arriva da un form l'oggetto req.body con tutti i campi del form, e devo salvarli nell'oggetto mongoose.
per non dover scrivere condice embedded (un assegnamento per ogni campo del form), c'è questo metodo che loopa su tutti i campi che arrivano dal form
e li salva pari pari nell'oggetto che andrà nel db.
*/
function populateModel(model, modelData) {
	//ciclo su tutte le property che mi arrivano in modelData (le dovrò replicare in model)
	for(var prop in modelData) {
		if(modelData.hasOwnProperty(prop))
		{
			//assegno a model la mia property, ma solo se non si tratta dell'id
			if( prop != "id" )
			{
				model[prop] = modelData[prop];
			}
		}
	}		
	
}



exports.defineRoutes = defineRoutes; 
exports.defineRoute404 = defineRoute404; 
exports.errorPage = errorPage; 
exports.setSignedIn = setSignedIn; 
exports.populateModel = populateModel; 
exports.checkPermissions = checkPermissions; 
exports.checkValidUser = checkValidUser; 
exports.hashPw = hashPw; 
exports.paginationInit = paginationInit; 
exports.paginationDo = paginationDo; 



