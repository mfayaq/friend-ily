const { db, admin } = require("../util/admin");

const firebaseConfig = require("../util/config");
const firebase = require("firebase");

firebase.initializeApp(firebaseConfig);

const {
	validateSignUp,
	validateLogin,
	reduceUserDetails
} = require("../util/validators");

//Sign Up Route
exports.signup = (req, res) => {
	const { email, password, confirmPassword, handle } = req.body;
	const newUser = {
		email,
		password,
		confirmPassword,
		handle
	};

	const { valid, errors } = validateSignUp(newUser);

	if (!valid) return res.status(400).json(errors);

	const noImg = "no-img.png";

	//TODO validate data
	let userId, token;
	db.doc(`/users/${newUser.handle}`)
		.get()
		.then(doc => {
			if (doc.exists) {
				return res.status(400).json({ handle: "this handle is already taken" });
			} else {
				return firebase
					.auth()
					.createUserWithEmailAndPassword(newUser.email, newUser.password);
			}
		})
		.then(data => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then(idToken => {
			token = idToken;
			const userCredentials = {
				handle: newUser.handle,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
				userId
			};
			db.doc(`/users/${newUser.handle}`).set(userCredentials);
		})
		.then(() => res.status(201).json({ token }))
		.catch(err => {
			console.log(err);
			if (err.code === "auth/email-already-in-use") {
				return res.status(400).json({ email: "Email is already in use" });
			} else {
				return res.status(500).json({ error: err.code });
			}
		});
};

//Login Route
exports.login = (req, res) => {
	const { email, password } = req.body;
	const user = {
		email,
		password
	};

	const { valid, errors } = validateLogin(user);

	if (!valid) return res.status(400).json(errors);

	firebase
		.auth()
		.signInWithEmailAndPassword(user.email, user.password)
		.then(data => {
			return data.user.getIdToken();
		})
		.then(token => {
			return res.json({ token });
		})
		.catch(err => {
			console.log(err);
			if (err.code === "auth/wrong-password") {
				return res
					.status(403)
					.json({ general: "Wrong credentials, please try again" });
			} else return res.status(500).json({ error: err.code });
		});
};

//Upload Image Route
exports.uploadImage = (req, res) => {
	const Busboy = require("busboy");
	const path = require("path");
	const os = require("os");
	const fs = require("fs");

	const busboy = new Busboy({ headers: req.headers });

	let imageToBeUploaded, imageName;

	busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
		const imageExtension = filename.split(".")[filename.split(".").length - 1];
		imageName = `${Math.round(
			Math.random() * 1000000000000000
		)}.${imageExtension}`;
		const filepath = path.join(os.tmpdir(), imageName);
		imageToBeUploaded = { filepath, mimetype };
		file.pipe(fs.createWriteStream(filepath));
	});
	busboy.on("finish", () => {
		admin
			.storage()
			.bucket()
			.upload(imageToBeUploaded.filepath, {
				resumable: false,
				metadata: {
					metadata: {
						contentType: imageToBeUploaded.mimetype
					}
				}
			})
			.then(() => {
				const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageName}?alt=media`;
				return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
			})
			.then(() => {
				return res.json({ message: "Image Uploaded successfully" });
			})
			.catch(err => {
				console.error(err);
				return res.status(500).json({ error: err.code });
			});
	});
	busboy.end(req.rawBody);
};

exports.addUserDetails = (req, res) => {
	let userDetails = reduceUserDetails(req.body);

	db.doc(`/users/${req.user.handle}`)
		.update(userDetails)
		.then(() => {
			res.json({ message: "User Details updated successfully" });
		})
		.catch(err => {
			console.log(err);
			res.status(400).json({ error: err.code });
		});
};

exports.getUserDetails = (req, res) => {
	let userData = {};
	db.doc(`/users/${req.params.handle}`)
		.get()
		.then(doc => {
			if (doc.exists) {
				userData.user = doc.data();
				return db
					.collection("screams")
					.where("userHandle", "==", req.params.handle)
					.orderBy("createdAt", "desc")
					.get();
			} else {
				return res.status(404).json({ error: "User not found" });
			}
		})
		.then(queryDoc => {
			userData.screams = [];
			queryDoc.forEach(doc => {
				let docData = doc.data();
				userData.screams.push({
					...docData,
					screamId: doc.id
				});
			});
			return res.json(userData);
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};

exports.getAuthenticatedUser = (req, res) => {
	let userData = {};
	db.doc(`/users/${req.user.handle}`)
		.get()
		.then(doc => {
			if (doc.exists) {
				userData.credentials = doc.data();
				return db
					.collection("likes")
					.where("userHandle", "==", req.user.handle)
					.get();
			}
		})
		.then(data => {
			userData.likes = [];
			data.forEach(doc => {
				userData.likes.push(doc.data());
			});
			return db
				.collection("notifications")
				.where("recipient", "==", req.user.handle)
				.orderBy("createdAt", "desc")
				.limit(10)
				.get();
		})
		.then(data => {
			userData.notifications = [];
			data.forEach(doc => {
				let docData = doc.data();
				userData.notifications.push({
					...docData,
					notificationId: doc.id
				});
			});
			return res.json(userData);
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.markNotificationsRead = (req, res) => {
	let batch = db.batch();
	req.body.forEach(notificationId => {
		const notification = db.doc(`/notifications/${notificationId}`);
		batch.update(notification, { read: true });
	});
	batch
		.commit()
		.then(() => {
			return res.json({ message: "Notifications marked read" });
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};
