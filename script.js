var TAPE_LEN = 32;
var inpTape = [];
var inpTapeWrap = [];
var currStartingPos = 0;
var itrLimit = 100;

function $(s){
	return document.getElementById(s);
}

function start(){
	prepTape();
};

function setStartingPos(newPos){
	inpTapeWrap[currStartingPos].className = "startFlag";
	currStartingPos = newPos;
	inpTapeWrap[currStartingPos].className = "startFlag startFlagOn";
	if($('tapeStartPos')) {
		$('tapeStartPos').value = newPos;
	}
}

function itrCountChange(){
	var itr = $('iterationCount').value;
	if (itr > 1 && itr < 9999) {
		itrLimit = itr;
	}
}

function prepTape() {
	var tp = $('tapeStart');

	// Clean out any elements.
	while (tp.firstChild) {
		tp.removeChild(tp.firstChild);
	}

	num = document.createElement("div");
	num.className = "tapeIdx";
	num.innerHTML = "";
	tp.appendChild(num);

	for (var i = 0; i < TAPE_LEN; i++) {
		var elt = document.createElement("div");
		elt.innerHTML = "0";
		elt.className = "data";
		elt.onclick = function(e){e,
			e.target.innerHTML = 1-e.target.innerHTML;
			e.target.className = "data " + ((e.target.innerHTML == "1")?" data1":"");
		}

		var startFlag = document.createElement("div");
		startFlag['cellno'] = i;
		startFlag.className = "startFlag";
		startFlag.onclick = function(e){
			setStartingPos(e.target.cellno);
		}

		var wrap = document.createElement("div");
		wrap.className = "tapeCell";
		wrap.appendChild(elt);
		wrap.appendChild(startFlag);

		inpTape[i] = elt;
		inpTapeWrap[i] = startFlag;

		tp.appendChild(wrap);
	};

	setStartingPos(1);
}

function startPosChange() {
	newPos = $('tapeStartPos').value;
	if (newPos >= 0 && newPos < TAPE_LEN) {
		setStartingPos(newPos);
	} else {
		$('tapeStartPos').value = Math.max(Math.min($('tapeStartPos').value, TAPE_LEN - 1), 0);
	}
}

function tapeLenChange() {
	newLen = $('tapeLen').value;
	if(newLen > 1) {
		TAPE_LEN = newLen;
		prepTape();
	}
}

function tapeContentsChange() {
	newCont = $('tapeContentsStd').value;
	newCont = newCont.split(",");
	nArr = [0];
	while(newCont.length > 0) {
		var x = (newCont.shift() * 1);
		if (x > 0 && x < TAPE_LEN) {
			nArr.push(x);
		}
	}

	var i = 0;
	while(i < TAPE_LEN && nArr.length > 0) {
		if(nArr[0] <= 0){
			nArr.shift();
			inpTape[i].innerHTML = "0";
		} else {
			nArr[0] = nArr[0] - 1;
			inpTape[i].innerHTML = "1";
		}
		i++;
	}

	while(i < TAPE_LEN) {
		inpTape[i].innerHTML = "0";
		i++;
	}

}

function getTapeContents() {
	var data = [];
	for(var i = 0; i < inpTape.length; ++i) {
		data.push(inpTape[i].innerHTML == "1"?1:0);
	}
	return Tape(data, currStartingPos);
}

function addTapeState(tape, state, i) {
	var newRow = document.createElement("div");
	newRow.className = "tapeView";
	var before = Math.floor(TAPE_LEN/2);
	var tp = tape.enumerateAroundHead(before, TAPE_LEN - before - 1);

	num = document.createElement("div");
	num.className = "tapeIdx";
	num.innerHTML = i;
	newRow.appendChild(num);

	var offset = tape.offset() - tp.position - 1;
	while (offset < 0)
		offset += 8;

	for(var i = 0; i < tp.state.length; ++i) {
		var elt = document.createElement("div");
		elt.innerHTML = tp.state[i];
		elt.className = "data " + ((elt.innerHTML == "1")?" data1":"");

		var wrap = document.createElement("div");
		wrap.className = "tapeCell";
		if ((offset + i) % 8 < 4)
			wrap.className += " hlTapeCell";

		wrap.appendChild(elt);
		
		if(i == tp.position) {
			var startFlag = document.createElement("div");
			startFlag.className = "startFlag startFlagOn";
			startFlag.innerHTML = state;
			wrap.appendChild(startFlag);
		}

		newRow.appendChild(wrap);
	}

	$('tapeRun').appendChild(newRow);
}

function clearOutput() {
	// Clear #tapeRun
	var tapeRun = $('tapeRun');
	while (tapeRun.firstChild) {
		tapeRun.removeChild(tapeRun.firstChild);
	}
}

function parseMachine() {
	var t = TuringMachineFromSpec($('instructions').value);

	if(!t.success){
		$('instructions').selectionStart = t.start;
		$('instructions').selectionEnd = t.end;

		$('runtimeOut').className = "runtimeError";
		$('runtimeOut').innerHTML = t.error;

		return false;
	}

	return t;
}

function run() {
	var t = parseMachine();
	if (!t)
		return;

	var tp = getTapeContents();
	
	clearOutput();
	// callback({last_action, state, tape_state, step})
	var rv = RunTuringMachine(t.machine, tp, t.startState, function(update) {
		addTapeState(update.tape_state, update.state, update.step + 1);
	}, {limit: itrLimit});

	$('runtimeOut').className = (rv.success)?"runtimeGood":"runtimeError";
	$('runtimeOut').innerHTML = rv.message;

}

function graphViz() {
	var t = parseMachine();
	if (!t)
		return;
	
	clearOutput();

	var gvDoc = "rankdir=LR;\n";
	gvDoc += "node [shape = doublecircle] " + t.haltingStates.join(" ") + ";\n";
	gvDoc += "node [shape = Mcircle] " + t.startState + ";\n";
    gvDoc += "node [shape = circle];\n";
    gvDoc += "\n";

    for (var fromState in t.machine) {
  		if (t.machine.hasOwnProperty(fromState)) {
    		for (var readVal = 0; readVal <= 1; readVal++) {
    			if(m[fromState][readVal]) {
    				gvDoc += "" + fromState + " -> " + m[fromState][readVal].next + " [ label=\"" + readVal + ":" + m[fromState][readVal].todo.toUpperCase() + "\" ];\n";
    			}
    		}
    	}
  	}

  	var nWrapper = document.createElement("div");
  	nWrapper.className = "codeView";
  	var nPre = document.createElement("pre");
  	var nCode = document.createElement("code");
  	nCode.appendChild(document.createTextNode(gvDoc));
  	nPre.appendChild(nCode);
  	nWrapper.appendChild(nPre);

  	$('tapeRun').appendChild(nWrapper);
}