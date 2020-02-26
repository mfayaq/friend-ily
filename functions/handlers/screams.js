const { db } = require("../util/admin");

exports.getAllScreams = (req, res) => {
	db.collection("screams")
		.orderBy("createdAt", "desc")
		.get()
		.then(data => {
			let screams = [];
			data.forEach(doc => {
				screams.push({
					screamId: doc.id,
					...doc.data()
				});
			});
			return res.json(screams);
		})
		.catch(err => {
			console.error(err);
		});
};

exports.postOneScream = (req, res) => {
	const newScream = {
		body: req.body.body,
		userHandle: req.user.handle,
		createdAt: new Date().toISOString()
	};

	db.collection("screams")
		.add(newScream)
		.then(doc => {
			return res.json({ message: `user ${doc.id} created successfully` });
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({ error: "Something wrong happened" });
		});
};

exports.getScream = (req, res) => {
	let screamData = {};
	db.doc(`/screams/${req.params.screamId}`)
		.get()
		.then(doc => {
			if (!doc.exists) {
				return res.status(400).json({ error: "Scream not found" });
			}
			screamData = doc.data();
			screamData.id = doc.id;
			return db
				.collection("comments")
				.orderBy("createdAt", "desc")
				.where("screamId", "==", req.params.screamId)
				.get();
		})
		.then(data => {
			screamData.comments = [];
			data.forEach(doc => {
				screamData.comments.push(doc.data());
			});
			return res.json(screamData);
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};

exports.commentOnScream = (req, res) => {
	let newComment = {
		screamId: req.params.screamId,
		body: req.body.body,
		createdAt: new Date().toISOString(),
		userHandle: req.user.handle,
		userImage: req.user.image
	};
	db.doc(`/screams/${req.params.screamId}`)
		.get()
		.then(doc => {
			if (!doc.exists) {
				return res.status(400).json({ error: "Scream not found" });
			}
			return db.collection("comments").add(newComment);
		})
		.then(() => {
			res.json(newComment);
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};
