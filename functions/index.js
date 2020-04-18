const functions = require("firebase-functions");
const app = require("express")();
const { db } = require("./util/admin");
const cookieParser = require("cookie-parser");

const {
	getAllScreams,
	postOneScream,
	getScream,
	commentOnScream,
	likeScream,
	unlikeScream,
	deleteScream,
} = require("./handlers/screams");
const {
	signup,
	login,
	getToken,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsRead,
} = require("./handlers/users");
// admin.initializeApp()
const FBAuth = require("./util/fbAuth");

app.use(cookieParser());

//Scream Routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);
app.get("/scream/:screamId", getScream);
app.delete("/scream/:screamId", FBAuth, deleteScream);
app.get("/scream/:screamId/like", FBAuth, likeScream);
app.get("/scream/:screamId/unlike", FBAuth, unlikeScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);

//User Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/getToken", getToken);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.region("asia-east2").https.onRequest(app);

exports.createNotificationOnLike = functions
	.region("asia-east2")
	.firestore.document("likes/{id}")
	.onCreate((snapshot) => {
		return db
			.doc(`screams/${snapshot.data().screamId}`)
			.get()
			.then((doc) => {
				if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle)
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: "like",
						read: "false",
						screamId: doc.id,
					});
			})
			.catch((err) => {
				console.error(err);
				return;
			});
	});

exports.deleteNotificationOnUnlike = functions
	.region("asia-east2")
	.firestore.document("likes/{id}")
	.onDelete((snapshot) => {
		console.log("deleting begins");
		return db
			.doc(`/notifications/${snapshot.id}`)
			.delete()
			.catch((err) => {
				console.error(err);
				return;
			});
	});

exports.createNotificationOnComment = functions
	.region("asia-east2")
	.firestore.document("comments/{id}")
	.onCreate((snapshot) => {
		return db
			.doc(`screams/${snapshot.data().screamId}`)
			.get()
			.then((doc) => {
				if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle)
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: "comment",
						read: "false",
						screamId: doc.id,
					});
			})
			.catch((err) => {
				console.error(err);
				return;
			});
	});

exports.onUserImageChange = functions
	.region("asia-east2")
	.firestore.document("/users/{usedId}")
	.onUpdate((change) => {
		console.log(change.before.data());
		console.log(change.after.data());
		if (change.before.data().imageUrl !== change.after.data().imageUrl) {
			console.log("Image has changed");
			let batch = db.batch();
			db.collection("screams")
				.where("userHandle", "==", change.before.data().handle)
				.get()
				.then((data) => {
					data.forEach((doc) => {
						const scream = db.doc(`/screams/${doc.id}`);
						batch.update(scream, { imageUrl: change.after.data().imageUrl });
					});
					return db
						.collection("comments")
						.where("userHandle", "==", change.before.data().handle)
						.get();
				})
				.then((data) => {
					data.forEach((doc) => {
						const comment = db.doc(`/comments/${doc.id}`);
						batch.update(comment, { imageUrl: change.after.data().imageUrl });
					});
					return batch.commit();
				})
				.catch((err) => console.log(err));
		} else return true;
	});

exports.onScreamDelete = functions
	.region("asia-east2")
	.firestore.document("/screams/{screamId}")
	.onDelete((snapshot, context) => {
		const screamId = context.params.screamId;
		console.log(screamId);
		let batch = db.batch();
		db.collection("comments")
			.where("screamId", "==", screamId)
			.get()
			.then((queryData) => {
				queryData.forEach((doc) => {
					batch.delete(db.doc(`/comments/${doc.id}`));
				});
				return db.collection("likes").where("screamId", "==", screamId).get();
			})
			.then((queryData) => {
				queryData.forEach((doc) => {
					batch.delete(db.doc(`/likes/${doc.id}`));
				});
				return db
					.collection("notifications")
					.where("screamId", "==", screamId)
					.get();
			})
			.then((queryData) => {
				queryData.forEach((doc) => {
					batch.delete(db.doc(`/notifications/${doc.id}`));
				});
				return batch.commit();
			})
			.catch((err) => console.log(err));
	});
