
var curUser;
var db;
var boards = [];
var curBoard = null;

var config = {
	apiKey: 'AIzaSyBPe-tuk-D9VeigholrdFkRdJ8sxe72zaY',
	authDomain: 'hanging-todo.firebaseapp.com',
	projectId: 'hanging-todo',
	//databaseURL: "https://hanging-todo.firebaseio.com",
	//storageBucket: "hanging-todo.appspot.com",
	//messagingSenderId: "<SENDER_ID>",
};

firebase.initializeApp(config);

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		curUser = user;
		loaderDiv.hidden = true;
		mainDiv.hidden = false;

	} else {
		
		var ui = new firebaseui.auth.AuthUI(firebase.auth());

		var uiConfig = {
			callbacks: {
				signInSuccess: function(currentUser, credential, redirectUrl) {
					return true; // @TODO wat does this do??
				},
				uiShown: function() {
					loaderDiv.style.display = 'none';
				}
			},
			signInFlow: 'popup',
			signInSuccessUrl: '/snow-todo/', // @TODO?
			signInOptions: [
				firebase.auth.GoogleAuthProvider.PROVIDER_ID,
				firebase.auth.EmailAuthProvider.PROVIDER_ID,
			],
			tosUrl: '/snow-todo/tos' // @TODO
		};

		ui.start('#firebaseui-auth-container', uiConfig); // The start method will wait until the DOM is loaded.
		
	}
});

db = firebase.firestore();
db.settings({timestampsInSnapshots: true});

db.enablePersistence()
	.then(function() {
		Go();
	})
	.catch(function(err) {
		if (err.code == 'failed-precondition') {
			console.log("Multiple tabs open, persistence can only be enabled in one tab at a a time."); // @TODO
		} else if (err.code == 'unimplemented') {
			console.log("The current browser does not support all of the features required to enable persistence."); // @TODO
		}
	});

function Go() {
	db.collection('boards').onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {
			if (change.type === "added") {
				var doc = change.doc;
				var data = doc.data();
				var newEl = document.createElement('li');
				var thisBoard = {
					name: data.name,
					doc: doc,
					el: newEl,
				};

				boards.push(thisBoard);

				newEl.innerText = data.name;
				newEl.onclick = function() {
					if (curBoard === thisBoard)
						return;

					curBoard = thisBoard;

					boards.forEach(function(board) {
						board.el.classList.remove('selected');
					});

					newEl.classList.add('selected');

					taskH1.innerText = curBoard.name;
					tasksDiv.hidden = false;
				};

				boardsUl.appendChild(newEl);
			}
			else if (change.type === "modified") {
				// @TODO
				//console.log("Modified: ", change.doc.data());
			}
			else if (change.type === "removed") {
				// @TODO
				//console.log("Removed: ", change.doc.data());
			}
		});
	}, function(error) {
		console.log(error); // @TODO
	});
}

newBoardInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = newBoardInput.value;
		newBoardInput.value = '';
		db.collection('boards').add({
			name: newName,
		})
		.then(function(docRef) {
			console.log(docRef);
		});
	}
};

addTaskInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';
	}
};
