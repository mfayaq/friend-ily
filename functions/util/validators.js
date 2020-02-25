const isEmail = email => {
	const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (regEx.test(email)) {
		return true;
	} else {
		return false;
	}
};

const isEmpty = str => {
	if (str.trim() === "") return true;
	else return false;
};

exports.validateSignUp = data => {
	let errors = {};

	if (isEmpty(data.email)) {
		errors.email = "Must not be empty";
	} else if (!isEmail(data.email)) {
		errors.email = "Must be a valid email address";
	}

	if (isEmpty(data.password)) {
		errors.password = "Must not be empty";
	}

	if (data.password !== data.confirmPassword) {
		errors.confirmPassword = "Passwords must match";
	}

	if (isEmpty(data.handle)) {
		errors.handle = "Must not be empty";
	}

	return {
		errors,
		valid: Object.keys(errors).length === 0 ? true : false
	};
};

exports.validateLogin = data => {
	let errors = {};

	if (isEmpty(data.email)) errors.email = "Must not be empty";
	if (isEmpty(data.password)) errors.password = "Must not be empty";

	return {
		errors,
		valid: Object.keys(errors).length === 0 ? true : false
	};
};

exports.reduceUserDetails = data => {
	let userDetails = {};
	let { bio, website, location } = data;
	if (!isEmpty(bio)) userDetails.bio = bio;
	if (!isEmpty(website)) {
		if (website.trim().substring(0, 4) !== "http") {
			website = `http://${website.trim()}`;
		}
		userDetails.website = website;
	}
	if (!isEmpty(location)) userDetails.location = location;

	return userDetails;
};
