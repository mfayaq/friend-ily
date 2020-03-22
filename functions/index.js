const functions = require("firebase-functions");
const app = require("express")();
const { db } = require("./util/admin");

const {
	getAllScreams,
	postOneScream,
	getScream,
	commentOnScream,
	likeScream,
	unlikeScream,
	deleteScream
} = require("./handlers/screams");
const {
	signup,
	login,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsRead
} = require("./handlers/users");
// admin.initializeApp()
const FBAuth = require("./util/fbAuth");

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
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.region("asia-east2").https.onRequest(app);

exports.createNotificationOnLike = functions
	.region("asia-east2")
	.firestore.document("likes/{id}")
	.onCreate(snapshot => {
		db.doc(`screams/${snapshot.data().screamId}`)
			.get()
			.then(doc => {
				if (doc.exists)
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: "like",
						read: "false",
						screamId: doc.id
					});
			})
			.then(() => {
				return;
			})
			.catch(err => {
				console.error(err);
				return;
			});
	});

exports.deleteNotificationOnUnlike = functions
	.region("asia-east2")
	.firestore.document("likes/{id}")
	.onDelete(snapshot => {
		console.log("deleting begins");
		db.doc(`/notifications/${snapshot.id}`)
			.delete()
			.then(() => {
				return;
			})
			.catch(err => {
				console.error(err);
				return;
			});
	});

exports.createNotificationOnComment = functions
	.region("asia-east2")
	.firestore.document("comments/{id}")
	.onCreate(snapshot => {
		db.doc(`screams/${snapshot.data().screamId}`)
			.get()
			.then(doc => {
				if (doc.exists)
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: "comment",
						read: "false",
						screamId: doc.id
					});
			})
			.then(() => {
				return;
			})
			.catch(err => {
				console.error(err);
				return;
			});
	});
