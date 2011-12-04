/**
 * jslardo - a social cms based on node.js
 *
 *
 * Copyright (C) 2011 Federico Carrara (federico@obliquid.it)
 *
 * For more information http://obliquid.org/
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */



//models

function defineModels(mongoose, app, next) {
	
	//definisco gli Schema per i modelli
	var Schema = mongoose.Schema;
	var ObjectId = Schema.ObjectId;	
	function validatePresenceOf(value) {
		return value && value.length;
	}
	
	//Schema user
	var User = new Schema({
		'name': { type: String, index: true, required: true },
		'profile': { type: String },
		'email': { type: String, validate: [validatePresenceOf, app.i18n.__('an email is required')], index: { unique: true } },
		'password': { type: String, required: true },
		'status': { type: String, required: true, enum: ['public', 'private'] },
		'created': { type: Date }
	});
	mongoose.model('user', User);
	
	//Schema site
	var Site = new Schema({
		'title': { type: String, index: { unique: true }, required: true },
		'author_id': { type: Schema.ObjectId, ref: 'User' },
		'status': { type: String, required: true, enum: ['public', 'private'] },
		'created': { type: Date }
	});
	mongoose.model('site', Site);
	
	//Schema linkedserver
	var Linkedserver = new Schema({
		'host': { type: String, validate: [validatePresenceOf, app.i18n.__('host is required')], index: { unique: true }, required: true },
		'description': String,
		'author_id': { type: Schema.ObjectId, ref: 'User' },
		'status': { type: String, required: true, enum: ['public', 'private'] },
		'created': { type: Date }
	});
	mongoose.model('linkedserver', Linkedserver);
	
	
	
	//esempi
	
	/*
	
	//un serial middleware [init|save|remove]
	User.pre('save', function (next) {
		email(this.email, 'Your record has changed');
		next();
	});
	//un parallel middleware [init|save|remove]
	User.pre('save', true, function (next, done) {
		
		next(); | done();
	});
	
	
	//attaccare metodi custom ad uno schema
	AnimalSchema.methods.findSimilarType = function findSimilarType (next) {
	  return this.find({ type: this.type }, next);
	};	
	var dog = new Animal({ name: 'Rover', type: 'dog' });
	dog.findSimilarType(function (err, dogs) {
	  if (err) return ...
	  dogs.forEach(..);
	})
	//oppure
	dog
	.findSimilarType()
	.where('name': /rover/i)
	.limit(20)
	.run(function (err, rovers) {
	  if (err) ...
	})
	
	
	
	//virtuals
	var PersonSchema = new Schema({
		name: {
			first: String
		  , last: String
		}
	});	
	PersonSchema
	.virtual('name.full')
	.get(function () {
	  return this.name.first + ' ' + this.name.last;
	})
	.set(function (setFullNameTo) {
	  var split = setFullNameTo.split(' ')
		, firstName = split[0]
		, lastName = split[1];

	  this.set('name.first', firstName);
	  this.set('name.last', lastName);
	});	
	
	
	//getters
	function obfuscate (cc) {
	  return '****-****-****-' + cc.slice(cc.length-4, cc.length);
	}
	var AccountSchema = new Schema({
	  creditCardNumber: { type: String, get: obfuscate }
	});	
	//& setters
	function toLower (v) {
	  return v.toLowerCase();
	}
	var UserSchema = new Schema({
	  email: { type: String, set: toLower } 
	});	
	
	
	//relazioni
	//nota: Schema.ObjectId è un data type che indica l'id di un'istanza (documento) qualsiasi (non specifica un model)
	//relazioni 1:1
	var CarSchema = new Schema({ driver: Schema.ObjectId })	//qui non ho specificato l'oggetto (model) relazionato
	var CarSchema = new Schema({ driver: { type: Schema.ObjectId, ref: 'driverModel' } })	//qui ho anche specificato l'oggetto relazionato
	//relazioni 1:N
	var CarSchema = new Schema({ driver: [Schema.ObjectId] })	
	var CarSchema = new Schema({ driver: [{ type: Schema.ObjectId, ref: 'driverModel' }] })	
	//poi sempre
	var Car = mongoose.model('Car', CarSchema);
	//come creo/salvo l'oggetto relazionato
	var myCar = new Car({ driver: myDriver });
		//oppure
		var myCar = new Car();
		myCar.driver = myDriver; //oppure myDriver._id
	myCar.save(function (err) {
		if (err) ...
	});
	//come popolo l'oggetto relazionato
	Car
	.findOne({ model: 'Fiat' })
	.populate('driver', ['name']) //  <-- only return the Driver name
	.run(function (err, myCar) {
		if (err) ..
		console.log('The driver is %s', myCar.driver.name);
	})



	//embedded documents
	//1:1
	var CarSchema = new Schema({ driver: DriverSchema })	//questa va?
	//1:N
	var CarSchema = new Schema({ driver: [DriverSchema] })	
	
	
	*/
	
	
	
	//alla fine chiamo il callback che mi hanno passato
	next();
}

exports.defineModels = defineModels; 

