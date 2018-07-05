
var appTitle;
var APP_NAME = 'hanging-todo';

var statusAr = [1, 5, 0, 2, 3, 4];
var statuses = {
	1: {name: "Immediate", expanded: true, done: 0, },
	5: {name: "Postponed", expanded: true, done: 0, },
	0: {name: "Optional", expanded: true, done: 0, },
	2: {name: "Done", expanded: false, done: 1, },
	3: {name: "Archived", expanded: false, done: 1, },
	4: {name: "Cancelled", expanded: false, done: 2, },
};

var newStatusAr = null;
var newStatuses = null;

var statusTypes = ["Not done", "Done", "Cancelled"];

var curUser;
var db;

var boards = {};
var boardArray = [];
var curBoard = null;
var settingBoard;
var lastBoard = null;

var workstations = {};
var workstationArray = [];
var curWorkstation = null;
var settingWorkstation;
var lastWorkstation = null;

var workstationButtons = {};

var statusButtons = {};

var selection = [];

var isCtrlDown = false;
var isShiftDown = false;
var addingToSelection = 0;

var config = {
	apiKey: 'AIzaSyBPe-tuk-D9VeigholrdFkRdJ8sxe72zaY',
	authDomain: 'hanging-todo.firebaseapp.com',
	projectId: 'hanging-todo',
	//databaseURL: "https://hanging-todo.firebaseio.com",
	//storageBucket: "hanging-todo.appspot.com",
	//messagingSenderId: "<SENDER_ID>",
};



function GetSetting(setting, defaultValue) {
	var value = localStorage.getItem(APP_NAME + setting);
	if (value === null) {
		return defaultValue;
	} else {
		return value;
	}
}

function SetSetting(setting, value) {
	localStorage.setItem(APP_NAME + setting, value);
}

function AddSelection(task) {
	if (selection.indexOf(task) === -1) {
		task.li.classList.add('selected');
		selection.push(task);
	}
}

function Select(task) {
	selection.forEach(function(selItem) {
		selItem.li.classList.remove('selected'); });
	selection = [task];
	task.li.classList.add('selected');
}

function Deselect(task) {
	var i = selection.indexOf(task);
	selection[i].li.classList.remove('selected');
	selection.splice(i, 1);
}

function DeselectAll() {
	//console.log('DeselectAll()');
	if (selection.length > 0) {
		selection.forEach(function(selItem) {
			selItem.li.classList.remove('selected'); });
		selection = [];
	}
}

function FocusDefault(e) {
	/*if (selection.length > 0) {
		e.preventDefault();
		selection[0].li.focus();
	} else {
		taskContextMenu.blur();
	}*/
	taskContextMenu.FocusOut(null);
	return false;
}

function AddTask(name, status, workstation) {
	if (status === undefined)
		status = 1;

	if (workstation === undefined)
		workstation = '';

	var newData = {
		name: name,
		workstation: workstation,
		status: status,
		created: firebase.firestore.FieldValue.serverTimestamp(),
	};

	curBoard.doc.ref.collection('tasks').add(newData)
		/*.then(function(docRef) {
			//console.log(docRef);
		})*/
		.catch(function(error) {
			console.error("Error writing document: ", error);
		});
}

function UpdateTaskWorkstation(task) {
	if (task.workstation !== ''
		&& (curWorkstation === null || curWorkstation.id !== task.workstation))
	{
		task.li.hidden = true;
	} else {
		task.li.hidden = false;
	}
}

function UpdateTask(task) {
	if (task.workstation !== '' && workstations.hasOwnProperty(task.workstation)) {
		if (task.tag === null) {
			var tagEl = document.createElement('i');
			task.li.appendChild(tagEl);
			task.tag = tagEl;
		}

		task.tag.innerText = workstations[task.workstation].name;

	} else if (task.tag !== null) {
		task.tag.remove();
		task.tag = null;
	}
}

function CloseWorkstationSelect() {
	curWorkstationDiv.className = '';
	workstationSelectionDiv.hidden = true;
}

function SetClass(els, className) {
	for (var i in els) {
		els[i].className = className;
	}
}

function AddWorkstationButton(id, title) {
	var button = document.createElement('button');
	button.innerText = (title === undefined ? id : title);
	button.onclick = function() {
		selection.forEach(function(task) {
			task.doc.ref.set({
				workstation: id,
			}, { merge: true }); // @TODO @low onerror
		});
		button.parentElement.hidden = true;
	};

	workstationButtons[id] = button;

	taskContextMenu.insertBefore(button, taskContextMenu.children[taskContextMenu.children.length - 2]);
}

function SetTaskStatus(task, status) {
	task.doc.ref.set({
		status: status,
	}, { merge: true }); // @TODO @low onerror
}

function ContextMenuInit(el) {
	el.FocusOut = function(e) {
		if (e === null || e.relatedTarget === null || (e.relatedTarget !== el && el.contains(e.relatedTarget) === false)) {
			el.hidden = true;
			if (lastWorkstation !== null)
				lastWorkstation.el.classList.remove('menuon');
			if (lastBoard !== null)
				lastBoard.el.classList.remove('menuon');
			if (isCtrlDown === false && selection.length === 1) {
				var found = false;
				if (e !== null)
					for (var s of selection) {
						if (e.relatedTarget === s.li || s.li.contains(e.relatedTarget)) {
							found = true;
							break;
						}
					}

				if (found === false)
					DeselectAll();
			}
		}
	};
	el.addEventListener('focusout', el.FocusOut);
}

function ShowContextMenu(el, e) {
	el.hidden = false;

	if (el.offsetHeight > document.documentElement.clientHeight) {
		el.style.top = 0 + 'px';
	} else if (el.offsetHeight + e.y > document.documentElement.clientHeight) {
		el.style.top = (document.documentElement.clientHeight - el.offsetHeight) + 'px';
	} else {
		el.style.top = (e.y) + 'px';
	}

	if (el.offsetWidth > document.documentElement.clientWidth) {
		el.style.left = 0 + 'px';
	} else if (el.offsetWidth + e.x > document.documentElement.clientWidth) {
		el.style.left = (document.documentElement.clientWidth - el.offsetWidth) + 'px';
	} else {
		el.style.left = (e.x) + 'px';
	}

	el.focus();
}

function CountTasks(board) {
	var count = 0;
	if (board.tasksByStatus.hasOwnProperty(1))
		for (var i = 0; i < board.tasksByStatus[1].length; i++) {
			var task = board.tasksByStatus[1][i];
			if (task.workstation !== '' 
				&& (curWorkstation === null || curWorkstation.id !== task.workstation)) {
			} else {
				count++; }
		}

	if (count > 0) {
		document.title = "(" + count + ") " + appTitle;
	} else {
		document.title = appTitle;
	}
}

function NameBoard(board) {
	board.el.innerText = board.name;
	board.heading.innerText = board.name;
}

function NameWorkstation(workstation) {
	workstation.el.innerText = workstation.name;
	if (curWorkstation === workstation)
		curWorkstationDiv.innerText = curWorkstation.name;
}

function ChangeWorkstation(workstation) {
	SetSetting('workstation', (workstation === null ? '' : workstation.id));
	curWorkstation = workstation;

	allWorkstationsButton.classList.remove('selected');
	workstationArray.forEach(function(item) {
		item.el.classList.remove('selected');
	});

	if (curWorkstation === null) {
		curWorkstationDiv.innerText = allWorkstationsButton.innerText;
		taskWorkstationSelect.hidden = true;
		allWorkstationsButton.classList.add('selected')
	} else {
		NameWorkstation(workstation);
		taskWorkstationSelect.hidden = false;
		curWorkstationRadio.nextSibling.innerText = curWorkstation.name;
		workstation.el.classList.add('selected');
	}

	if (curBoard !== null) for (var i in curBoard.tasks) {
		var task = curBoard.tasks[i];
		UpdateTaskWorkstation(task);
	}

	CloseWorkstationSelect();
}

function ChangeBoard(thisBoard) {
	if (curBoard === thisBoard) {
		InitRename(thisBoard);
		return;
	}

	SetSetting('board', (thisBoard === null ? '' : thisBoard.doc.id));

	curBoard = thisBoard;

	while (taskStatuses.firstChild) {
		taskStatuses.firstChild.remove();
	}

	for (var i in thisBoard.statusAr) {
		var si = thisBoard.statusAr[i];
		CreateStatusButton(si, thisBoard.statuses[si].name);
	}

	boardArray.forEach(function(board) {
		board.el.classList.remove('selected');
	});

	thisBoard.el.classList.add('selected');

	if (curBoard.subscription === null) {
		curBoard.subscription = curBoard.doc.ref.collection('tasks').onSnapshot(function(snapshot) {
			snapshot.docChanges().forEach(function(change) {
				if (change.type === "added") {
					var doc = change.doc;
					var data = doc.data();
					var newEl = document.createElement('li');
					var task = {
						name: data.name,
						workstation: data.workstation,
						status: data.status,
						doc: doc,
						li: newEl,
						el: document.createElement('span'),
						tag: null,
					};

					thisBoard.tasks[doc.id] = task;

					if (thisBoard.tasksByStatus.hasOwnProperty(task.status) === false) {
						thisBoard.tasksByStatus[task.status] = []; }
					thisBoard.tasksByStatus[task.status].push(task);

					var completeButton = document.createElement('button');
					completeButton.innerText = "✓";
					completeButton.onclick = function(e) {
						if (thisBoard.statuses[task.status].done === 1) {
							SetTaskStatus(task, 1);
						} else {
							SetTaskStatus(task, 2);
						}
						e.stopPropagation();
						return false;
					};

					task.el.innerText = task.name;
					newEl.tabIndex = '0';
					newEl.appendChild(completeButton);
					newEl.appendChild(task.el);

					UpdateTask(task);

					newEl.onmousedown = function(e) {
						if (e.shiftKey === true) {
							if (e.button !== 0)
								return;
							
							if (selection.length > 0 && selection[selection.length - 1].status === task.status) {
								if (selection.indexOf(task) === -1) {
									let lastTask = selection[selection.length - 1];
									let taskList = curBoard.tasksByStatus[lastTask.status];
									let iStart = taskList.indexOf(lastTask);
									let iEnd = taskList.indexOf(task);

									if (iStart > iEnd) {
										let tmp = iStart;
										iStart = iEnd;
										iEnd = tmp - 1;
									} else {
										iStart += 1;
									}
									
									for (let i = iStart; i <= iEnd; i++) {
										AddSelection(taskList[i]);
									}
								}

							} else {
								Select(task);
							}

						} else if (e.ctrlKey === true) {
							if (e.button !== 0)
								return;

							if (selection.indexOf(task) === -1) {
								AddSelection(task);
								//console.log('onmousedown: ctrlKey: select', task, selection);
							} else {
								Deselect(task);
								task.li.blur();
								e.preventDefault();
								//console.log('onmousedown: ctrlKey: deselect', task, selection);
							}
						} else if (selection.indexOf(task) !== -1) {
							if (e.button === 0 && document.activeElement === task.li && task.el.contentEditable !== 'plaintext-only') {
								e.preventDefault();
								InitRename(task); // @TODO don't if was just renaming
							}
						} else {
							Select(task);
						}
					};
					newEl.onclick = function(e) {
						
					};
					newEl.oncontextmenu = function(e) {
						if (selection.indexOf(task) === -1) {
							Select(task);
						}

						SetClass(statusButtons, '');
						statusButtons[task.status].className = 'selected';

						SetClass(workstationButtons, '');
						workstationButtons[task.workstation].className = 'selected';

						if (thisBoard.statuses[task.status].done === 1) {
							repeatTask.onclick = function(e) {
								SetTaskStatus(task, 1);
								return FocusDefault(e);
							};

							repeatTask.hidden = false;
							repeatTask.nextSibling.hidden = false;
						} else {
							repeatTask.hidden = true;
							repeatTask.nextSibling.hidden = true;
						}

						if (thisBoard.statuses[task.status].done === 0) {
							focusedLabel.hidden = false;
							focusedLabel.nextSibling.hidden = false;
						} else {
							focusedLabel.hidden = true;
							focusedLabel.nextSibling.hidden = true;
						}

						ShowContextMenu(taskContextMenu, e);
						return false;
					};
					newEl.addEventListener('focusout', function(e) {
						//console.log('task focusout:', this, e);
						if (isCtrlDown || isShiftDown)
							return;
						if (selection.length === 0)
							return;
						if (e.relatedTarget === taskContextMenu)
							return;
						if (newEl.contains(e.relatedTarget))
							return;

						for (var s of selection) {
							if (e.relatedTarget === s.li) {
								return;
							}
						}

						DeselectAll();
						//console.log('focusout: DeselectAll()');
					});

					if (addingToSelection > 0) {
						AddSelection(task);
						addingToSelection--;
					}

					UpdateTaskWorkstation(task);
					thisBoard.uls[task.status].appendChild(newEl);
				}
				else if (change.type === "modified") {
					//console.log("modified: ", change, change.doc.data());

					var task = thisBoard.tasks[change.doc.id];
					var data = change.doc.data();
					
					if (task.status !== data.status) {
						thisBoard.uls[data.status].appendChild(task.li);
						thisBoard.tasksByStatus[task.status].splice(thisBoard.tasksByStatus[task.status].indexOf(task), 1);
						task.status = data.status;

						if (thisBoard.tasksByStatus.hasOwnProperty(task.status) === false) {
							thisBoard.tasksByStatus[task.status] = []; }
						thisBoard.tasksByStatus[task.status].push(task);
					}

					task.name = data.name;
					task.workstation = data.workstation;

					UpdateTask(task);

					task.el.innerText = task.name;
				}
				else if (change.type === "removed") {
					var task = thisBoard.tasks[change.doc.id];

					task.li.remove();

					thisBoard.tasksByStatus[task.status].splice(thisBoard.tasksByStatus[task.status].indexOf(task), 1);
					delete thisBoard.tasks[change.doc.id];

					//console.log("removed: ", change, change.doc.data());
				}
			});

			//thisBoard.loaded = true;
			CountTasks(curBoard);
		}, function(error) {
			console.error('boards:', error); // @TODO
		});
	}

	boardArray.forEach(function(board) {
		board.div.hidden = true;
	});

	thisBoard.div.hidden = false;

	tasksDiv.hidden = false;

	CountTasks(curBoard);
}

function InitRename(item, afterFn) {
	//item.el.contentEditable = true;
	item.el.contentEditable = 'plaintext-only';
	item.el.focus();
	item.el.onkeydown = function(e) {
		if (e.keyCode === 13) { // Enter
			this.contentEditable = false;
			item.doc.ref.set({
				name: this.innerText,
			}, {merge: true}); // @TODO @low onerror
			if (afterFn !== undefined)
				afterFn();
			return false;

		} else if (e.keyCode === 27) { // Escape
			this.contentEditable = false;
			this.innerText = item.name;
			if (afterFn !== undefined)
				afterFn();
			return false;
		}
	};
	item.el.onblur = function(e) {
		this.contentEditable = false;
		if (afterFn !== undefined)
			afterFn();
	};
}

function AddStatus(si, s) {
	let statusLi = document.createElement('li');
	statusLi.status = s;
	statusLi.iStatus = si;

	let reorderSpan = document.createElement('span');
	reorderSpan.className = 'drag';
	reorderSpan.innerText = '≡';

	if (si === 1) {
		reorderSpan.classList.add('disabled');
	} else {
		reorderSpan.onmousedown = function(e) {

			let found = null;

			statusLi.classList.add('dragging');

			tasksDiv.onmousemove = function(e) {

				let lastFound = found;

				for (let i = 0; i < statusUl.children.length; i++) {
					let sLi = statusUl.children[i];

					if (sLi === statusLi)
						continue;

					let r = sLi.getClientRects()[0];
					if (e.y > r.bottom - (r.height / 2)) {
						found = sLi;
					}
				}

				if (found !== null)
					found.classList.add('dragbelow');
				if (lastFound !== null && lastFound !== found) {
					lastFound.classList.remove('dragbelow');
				}
			};
			tasksDiv.onmouseup = function(e) {
				statusLi.classList.remove('dragging');

				if (found !== null) {
					found.classList.remove('dragbelow');
					if (found.nextSibling) {
						statusUl.insertBefore(statusLi, found.nextSibling);
					} else {
						statusUl.appendChild(statusLi);
					}
				}

				tasksDiv.onmousemove = null;
				tasksDiv.onmouseup = null;
			};
		};
	}

	statusLi.appendChild(reorderSpan);

	let nameInput = document.createElement('input');
	statusLi.nameInput = nameInput;
	nameInput.value = s.name;
	statusLi.appendChild(nameInput);

	let typeDiv = document.createElement('div');
	typeDiv.className = 'radios';

	statusLi.doneRadios = [];

	for (let ti = 0; ti < statusTypes.length; ti++) {
		let type = statusTypes[ti];

		let radio = document.createElement('input');
		statusLi.doneRadios[ti] = radio;
		radio.name = 'type' + si;
		radio.type = 'radio';
		radio.value = ti;
		if (ti === 0)
			radio.className = 'default';
		if (s.done === ti)
			radio.checked = true;
		radio.onchange = function() {
			if (this.checked && this.value == 0)
				typeDiv.classList.add('default');
			else
				typeDiv.classList.remove('default');
		};

		if (si === 1 || si === 2) {
			radio.disabled = true; }

		let label = document.createElement('label');

		let span = document.createElement('span')
		span.innerText = statusTypes[ti];

		label.appendChild(radio);
		label.appendChild(span);
		typeDiv.appendChild(label);
	}
	if (s.done === 0)
		typeDiv.classList.add('default');
	if (si === 1 || si === 2) {
		typeDiv.classList.add('disabled');
	}
	statusLi.appendChild(typeDiv);

	let expandedInput = document.createElement('input');
	statusLi.expandedInput = expandedInput;
	expandedInput.type = 'checkbox';
	if (s.expanded === true)
		expandedInput.checked = true;

	if (si !== 1) {
		let expandedLabel = document.createElement('label');
		expandedLabel.appendChild(expandedInput);
		expandedLabel.appendChild(document.createTextNode('Expanded'));
		statusLi.appendChild(expandedLabel);
	}

	if (si !== 1 && si !== 2) {
		let deleteButton = document.createElement('button');
		deleteButton.innerText = "×";
		deleteButton.className = 'delete';
		deleteButton.onclick = function() {
			newStatusAr.splice(newStatusAr.indexOf(si), 1);
			delete newStatuses[si];
			statusLi.remove();
		};
		statusLi.appendChild(deleteButton);
	}

	statusUl.appendChild(statusLi);
}



appTitle = document.title;

firebase.initializeApp(config);

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		curUser = user;
		userImg.src = curUser.photoURL;
		loaderDiv.hidden = true;
		mainDiv.hidden = false;

	} else {

		mainDiv.hidden = true;
		
		var ui = new firebaseui.auth.AuthUI(firebase.auth());

		var uiConfig = {
			callbacks: {
				signInSuccess: function(currentUser, credential, redirectUrl) {
					document.getElementById('firebaseui-auth-container').hidden = true;
					return true; // @TODO wat does this do??
				},
				uiShown: function() {
					loaderDiv.style.display = 'none';
				}
			},
			signInFlow: 'popup',
			signInSuccessUrl: '/Hanging-Todo/', // @TODO?
			signInOptions: [
				firebase.auth.GoogleAuthProvider.PROVIDER_ID,
				firebase.auth.EmailAuthProvider.PROVIDER_ID,
			],
			tosUrl: '/Hanging-Todo/tos' // @TODO
		};

		document.getElementById('firebaseui-auth-container').hidden = false;
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
			console.error("Multiple tabs open, persistence can only be enabled in one tab at a a time."); // @TODO
		} else if (err.code == 'unimplemented') {
			console.error("The current browser does not support all of the features required to enable persistence."); // @TODO
		}
	});

function Go() {
	settingWorkstation = GetSetting('workstation', '');
	settingBoard = GetSetting('board', '');

	if (settingWorkstation === '')
		ChangeWorkstation(curWorkstation);

	// workstations --------------------------
	db.collection('workstations').where('userid', '==', curUser.uid).onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {
			if (change.type === "added") {
				var doc = change.doc;
				var data = doc.data();
				var newEl = document.createElement('li');
				var newWorkstation = {
					id: doc.id,
					name: data.name,
					doc: doc,
					el: newEl,
				};

				workstations[doc.id] = newWorkstation;
				workstationArray.push(newWorkstation);

				NameWorkstation(newWorkstation);
				
				newEl.onclick = function() {
					if (newWorkstation.el.contentEditable === 'plaintext-only')
						return;
					
					if (newWorkstation === curWorkstation) {
						InitRename(newWorkstation);
						return;
					}
					ChangeWorkstation(newWorkstation);
				};
				newEl.oncontextmenu = function(e) {
					lastWorkstation = newWorkstation;
					newWorkstation.el.classList.add('menuon');

					editWorkstation.onclick = function() {
						InitRename(newWorkstation);
						workstationContextMenu.FocusOut(null);
						return false;
					};
					deleteWorkstation.onclick = function() {
						newWorkstation.doc.ref.delete().then(function() {
							//console.log("Document successfully deleted!");
						}).catch(function(error) {
							console.error("Error removing document: ", error);
						});
						workstationContextMenu.FocusOut(null);
						return false;
					};
					ShowContextMenu(workstationContextMenu, e);
					return false;
				};

				if (settingWorkstation === newWorkstation.id) {
					ChangeWorkstation(newWorkstation);
				}

				AddWorkstationButton(newWorkstation.id, newWorkstation.name);

				workstationsUl.appendChild(newEl);
			}
			else if (change.type === "modified") {
				var data = change.doc.data();
				var workstation = workstations[change.doc.id];
				workstation.name = data.name;
				NameWorkstation(workstation);
				
				//console.log("Modified: ", data);
			}
			else if (change.type === "removed") {
				var workstation = workstations[change.doc.id];

				if (curWorkstation === workstation) {
					ChangeWorkstation(null);
				}

				workstation.el.remove();

				workstationArray.splice(workstationArray.indexOf(workstation), 1);
				delete workstations[change.doc.id];

				//console.log("Removed: ", change.doc.data());
			}
		});
	}, function(error) {
		console.error('workstations:', error); // @TODO
	});

	// boards --------------------------
	db.collection('boards').where('userid', '==', curUser.uid).where('status', '==', 1).onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {

			function DeleteBoard(board) {
				board.el.remove();
				board.div.remove();

				if (board.subscription !== null)
					board.subscription(); // unsubscribe

				if (curBoard === board) {
					tasksDiv.hidden = true;
				}

				boardArray.splice(boardArray.indexOf(board), 1);
				delete boards[change.doc.id];
			}

			if (change.type === "added") {
				var doc = change.doc;
				var data = doc.data();

				if (data.status < 0) {
					return;
				}

				var newEl = document.createElement('li');
				var thisBoard = {
					name: data.name,
					status: data.status,
					doc: doc,
					el: newEl,
					subscription: null,
					div: document.createElement('div'),
					heading: document.createElement('h2'),
					uls: {},
					hs: {},
					tasks: {},
					tasksByStatus: {},
					statusAr: statusAr,
					statuses: statuses,
					//loaded: false,
				};

				if (data.hasOwnProperty('statusAr')) {
					thisBoard.statusAr = data.statusAr; }
				if (data.hasOwnProperty('statuses')) {
					thisBoard.statuses = data.statuses; }

				boards[doc.id] = thisBoard;
				boardArray.push(thisBoard);

				newEl.onclick = function() {
					if (thisBoard.el.contentEditable === 'plaintext-only')
						return;

					ChangeBoard(thisBoard);
				};
				newEl.oncontextmenu = function(e) {
					lastBoard = thisBoard;
					thisBoard.el.classList.add('menuon');

					editBoard.onclick = function() {
						InitRename(thisBoard);
						boardContextMenu.FocusOut(null);
						return false;
					};
					
					deleteBoard.onclick = function() {
						thisBoard.doc.ref.set({
							status: -1,
						}, { merge: true }); // @TODO @low onerror
						/*if (thisBoard.loaded === true) {
							if (thisBoard.tasks.length === 0) {
								thisBoard.doc.ref.delete().then(function() {
									//console.log("Document successfully deleted!");
								}).catch(function(error) {
									console.error("Error removing document: ", error);
								});
							}
						}*/
						boardContextMenu.FocusOut(null);
						return false;
					};
					ShowContextMenu(boardContextMenu, e);
					return false;
				};

				boardsUl.appendChild(newEl);

				NameBoard(thisBoard);

				thisBoard.div.hidden = true;
				thisBoard.heading.hidden = true;
				thisBoard.div.appendChild(thisBoard.heading);

				for (var i in thisBoard.statusAr) {
					var si = thisBoard.statusAr[i];
					if (si !== 1) {
						thisBoard.hs[si] = document.createElement('h3');
						thisBoard.hs[si].innerText = thisBoard.statuses[si].name;
						thisBoard.hs[si].className = thisBoard.statuses[si].name;
						if (thisBoard.statuses[si].expanded === true)
							thisBoard.hs[si].classList.add('expanded');
						thisBoard.div.appendChild(thisBoard.hs[si]);

						thisBoard.hs[si].onclick = function() {
							if (this.nextSibling.hidden) {
								this.classList.add('expanded');
								this.nextSibling.hidden = false;
							} else {
								this.classList.remove('expanded');
								this.nextSibling.hidden = true;
							}
						};
						thisBoard.hs[si].oncontextmenu = function(e) {
							ShowContextMenu(statusContextMenu, e);
							return false;
						};
					}

					thisBoard.uls[si] = document.createElement('ul');
					thisBoard.uls[si].className = thisBoard.statuses[si].name;
					if (thisBoard.statuses[si].expanded !== true) {
						thisBoard.uls[si].hidden = true; }
					thisBoard.div.appendChild(thisBoard.uls[si]);
				}

				tasksDiv.appendChild(thisBoard.div);

				if (settingBoard === thisBoard.doc.id) {
					ChangeBoard(thisBoard);
				}
			}
			else if (change.type === "modified") {
				// @TODO if already deleted?
				var data = change.doc.data();
				var board = boards[change.doc.id];

				if (data.status < 0) {
					DeleteBoard(board);
					return;
				}

				board.name = data.name;
				NameBoard(board);
				//console.log("Modified: ", data);
			}
			else if (change.type === "removed") {
				var board = boards[change.doc.id];
				DeleteBoard(board);

				//console.log("Removed: ", change.doc.data());
			}
		});
	}, function(error) {
		console.error('boards:', error); // @TODO
	});
}

newWorkstationInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';
		db.collection('workstations').add({
			name: newName,
			userid: curUser.uid,
		})
		.then(function(docRef) {
			//console.log(docRef);
		});
	}
};

newBoardInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';
		db.collection('boards').add({
				name: newName,
				status: 1,
				userid: curUser.uid,
			})
			.then(function(docRef) {
				//console.log(docRef);
			});
	}
};

addTaskInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';
		var workstation = '';

		if (curWorkstation !== null && curWorkstationRadio.checked) {
			workstation = curWorkstation.id;
		}

		AddTask(newName, 1, workstation);
	}
};

logoutButton.onclick = function() {
	firebase.auth().signOut().then(function() {
		
	}, function(error) {
		console.error('signOut', error);
	});
};

allWorkstationsButton.onclick = function() {
	ChangeWorkstation(null);
};
allWorkstationsButton.oncontextmenu = function() {
	return false;
};

curWorkstationDiv.onclick = function() {
	if (workstationSelectionDiv.hidden) {
		this.className = 'expanded';
		workstationSelectionDiv.hidden = false;
	} else {
		CloseWorkstationSelect();
	}
}

//allBoardsButton.oncontextmenu = function() { return false; };

ContextMenuInit(userMenu);
ContextMenuInit(workstationContextMenu);
ContextMenuInit(boardContextMenu);
ContextMenuInit(taskContextMenu);
ContextMenuInit(statusContextMenu);

deleteTask.onclick = function(e) {
	for (var task of selection) {
		task.doc.ref.delete()/*.then(function() {
			//console.log("Document successfully deleted!");
		})*/.catch(function(error) {
			console.error("Error removing document: ", error);
		});
	}
	return FocusDefault(e);
};

function CreateStatusButton(status, name) {
	var button = document.createElement('button');
	button.innerText = name;
	button.onclick = function(e) {
		selection.forEach(function(task) { SetTaskStatus(task, status); });
		return FocusDefault(e);
	};

	statusButtons[status] = button;

	taskStatuses.appendChild(button);
}

AddWorkstationButton('', '(any)');

var a = taskWorkstationSelect.getElementsByTagName('input');

for (var i in a) {
	a[i].onchange = function() {
		if (curWorkstationRadio.checked) {
			taskWorkstationSelect.classList.remove('default');
		} else {
			taskWorkstationSelect.classList.add('default');
		}
	};
}

userImg.onclick = function() {
	userMenu.hidden = false;
	userMenu.focus();
};

importButton.onclick = function(e) {
	importer.hidden = false;
	tasksDiv.classList.add('importershown');
	userMenu.FocusOut(null);
};

importer.ondragenter = function(e) {
	this.classList.add('active');
};

importer.ondragleave = function(e) {
	this.classList.remove('active');
};

importer.ondragover = function(e) {
	e.preventDefault();
	this.classList.remove('active');
}

importer.ondrop = function(ev) {
	ev.preventDefault();

	var file = null;

	if (ev.dataTransfer.items) {
		if (ev.dataTransfer.items.length <= 0)
			return;
		
		var i = 0;
		if (ev.dataTransfer.items[i].kind === 'file') {
			file = ev.dataTransfer.items[i].getAsFile();
		}
	} else {
		file = ev.dataTransfer.files[0];
	}

	if (file === null)
		return;

	var reader = new FileReader();
  
	reader.onload = function(theFile) {
		var w = JSON.parse(reader.result);
		//console.log(w);

		dragHere.hidden = true;
		
		for (var i = 0; i < w.data.lists.length; i++) {
			(function(i) {
				var list = w.data.lists[i];
				var newEl = document.createElement('li');
				newEl.innerText = "Import " + list.title;

				newEl.onclick = function() {
					for (var j = 0; j < w.data.tasks.length; j++) {
						var task = w.data.tasks[j];
						if (task.list_id === list.id && task.completed !== true) {
							addingToSelection++;
							AddTask(task.title);
						}
					}
					// @TODO feedback to user
				};

				listList.appendChild(newEl);
			})(i);
		}
	};

	reader.readAsText(file);

	return false;
}

closeImporter.onclick = function() {
	importer.hidden = true;
	tasksDiv.classList.remove('importershown');
};

editStatuses.onclick = function() {

	while (statusUl.firstChild) {
		statusUl.firstChild.remove();
	}

	newStatusAr = curBoard.statusAr.slice();
	newStatuses = Object.assign({}, curBoard.statuses);

	for (let si of newStatusAr) {
		let s = newStatuses[si];
		AddStatus(si, s);
	}

	statusEdit.hidden = false;
	statusContextMenu.FocusOut(null);
};

cancelStatusEdit.onclick = function() {
	statusEdit.hidden = true;
};

saveStatusEdit.onclick = function() {
	newStatusAr = [];

	for (let i = 0; i < statusUl.children.length; i++) {
		let sLi = statusUl.children[i];
		let si = sLi.iStatus;
		newStatusAr.push(sLi.iStatus);
		newStatuses[si].name = sLi.nameInput.value;
		newStatuses[si].expanded = sLi.expandedInput.checked;
		for (let j = 0; j <= 2; j++) {
			if (sLi.doneRadios[j].checked) {
				newStatuses[si].done = j;
				break;
			}
		}
	}

	curBoard.doc.ref.set({
		statusAr: newStatusAr,
		statuses: newStatuses,
	}, { merge: true });
	statusEdit.hidden = true;
};

addStatus.onclick = function() {
	let si = 0;
	while (newStatusAr.indexOf(si) !== -1) {
		si++;
	}
	newStatusAr.push(si);

	let s = {name: "New", expanded: true, done: 0, };
	newStatuses[si] = s;
	AddStatus(si, s);
};

document.onkeydown = function(e) {
	if (e.ctrlKey)
		isCtrlDown = true;
	if (e.shiftKey)
		isShiftDown = true;
}

document.onkeyup = function(e) {
	if (e.ctrlKey === false)
		isCtrlDown = false;
	if (e.shiftKey === false)
		isShiftDown = false;
}
