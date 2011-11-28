//models

function defineModels(mongoose, cb) {
	
	//definisco gli Schema per i modelli
	var Schema = mongoose.Schema;
	var ObjectId = Schema.ObjectId;	
	function validatePresenceOf(value) {
		return value && value.length;
	}
	
	//Schema user
	var User = new Schema({
		'name': { type: String, index: true, required: true },
		'address': { type: String },
		'piva': { type: String },
		'email': { type: String, validate: [validatePresenceOf, 'an email is required'], index: { unique: true } },
		'password': { type: String, required: true }
	});
	mongoose.model('user', User);
	
	//Schema project
	var Project = new Schema({
		'name': { type: String, index: true, required: true },
		'customer': [User]
	});
	mongoose.model('project', Project);
	
	
	
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
	AnimalSchema.methods.findSimilarType = function findSimilarType (cb) {
	  return this.find({ type: this.type }, cb);
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
	cb();
}

exports.defineModels = defineModels; 

