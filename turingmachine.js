function stripComments(ln){
	comments = ["//", ';', '#'];
	for (var i = 0; i < comments.length; ++i) {
		commentPos = ln.indexOf(comments[i]);
		if (commentPos >= 0) {
			ln = ln.substr(0, commentPos);
		}
	}
	return ln;
}

function TuringMachineFromSpec(spec) {
	lines = spec.split('\n');
	lineStartOffset = 0;

	stSt = "";

	// Machine
	m = {};

	// Halting states
	hs = [];

	// Return container.
	rv = {success: false, error: "unknown", start: -1, end: -1};

	for(var i = 0; i < lines.length; ++i) {
		ln = stripComments(lines[i]).trim();

		if (ln.length > 0) {
			ln = ln.split(',');
			
			rv.start = lineStartOffset;
			rv.end = lineStartOffset + lines[i].length;
			// Check to see if this instruction is legal:
			if (ln.length != 4) {
				rv.error = "Exactly 4 required in specification.";
				return rv;
			}

			// Read the various parts of the instruction.
			var fromState = ln[0].trim();
			var ifRead = ln[1].trim();
			var doThis = ln[2].trim().toLowerCase();
			var toState = ln[3].trim();

			if (fromState == "" || toState == "") {
				rv.error = "Empty state names not allowed.";
				return rv;
			} else if (ifRead != "0" && ifRead != "1") {
				rv.error = "You can only read 0 and 1.";
				return rv;
			} else if (['0', '1', 'r', 'l'].indexOf(doThis) < 0) {
				rv.error = "You can only do 0, 1, r, or l.";
				return rv;
			}

			if(!stSt)
				stSt = fromState;

			// Add this to the list of possible halting states if need be.
			if (fromState != toState) {
				// If it is not already in the list and not a source state in the machine
				if (hs.indexOf(toState) < 0 && !m.hasOwnProperty(toState)) {
					// Add it to the list of possible halting states.
					hs.push(toState);
				}
			}
			

			ifRead = ifRead * 1;
			// Check if this fromState already exists
			if (!m.hasOwnProperty(fromState)) {
				m[fromState] = [null, null];

				// Remove it from the list of halting states
				var hsC = hs.indexOf(fromState);
				if(hsC >= 0) {
					hs.splice(hsC, 1);
				}
			}

			// Check if this ifRead is already defined.
			if(!!m[fromState][ifRead]) {
				rv.error = "(" + fromState + ", " + ifRead + ") already defined.";
				return rv;
			} else {
				m[fromState][ifRead] = {
					todo: doThis,
					next: toState,
					source: [rv.start, rv.end]
				}
			}
		}

		// For error tracking.
		lineStartOffset += lines[i].length + 1;

	}

	return {success: true, machine: m, startState: stSt, haltingStates: hs};
}

function Tape(data, position) {
	var T = {};
	var tape = data;
	var pos = position;

	T.left = function() {
		if (pos > 0) {
			pos--;
		} else {
			tape.unshift(0);
		}
	};

	T.right = function() {
		pos++;
		if (pos >= tape.length) {
			tape.push(0);
		} 
	};

	T.read = function() {
		return tape[pos];
	};

	T.write = function(v) {
		tape[pos] = v;
	};

	T.offset = function() {
		return pos;
	};

	T.enumerate = function(start, end) {
		var rv = [];
		var i;
		var j = 0; // Current head position

		// Before the tape
		for (i = start; i < Math.min(end, 0); i++) {
			rv.push(0);
			j++;
		};

		j += pos - i; 
		// During the tape
		for (; i < Math.min(end, tape.length); i++) {
			rv.push(tape[i]);
		};

		// After the tape
		for (; i < end; i++) {
			rv.push(0);
		};

		return {state: rv, position: j};
	}

	T.enumerateAroundHead = function(before, after) {
		return T.enumerate(pos - before, pos + after + 1);
	}

	return T;
}

// Run a turing machine.
// machine, tape, position, callback, params
// params = {limit: 100, }
// callback({last_action, state, tape_state, errorStr, step})
// returns {success: true/false, tape, errorStr}

function RunTuringMachine(m, tape, st, cb, params) {
	if (!params['limit'])
		params['limit'] = 100;

	for(var i = 0; i < params.limit; ++i) {
		var v = tape.read();
		// Find the state
		var tb = m[st];
		if (!tb) {
			return {success: true, tape: tape, message:"Halted in \"" + st + "\" after " + i + " iterations."};
		}

		// Find the next instruction
		var act = tb[v];
		if (!act) {
			return {success: false, tape: tape, message:"Halted on partially defined state \"" + st + "\"."};
		}

		var rv;
		switch(act.todo) {
			case "0":
			case "1":
				rv = tape.write(act.todo * 1);
				break;
			case "r":
				rv = tape.right();
				break;
			case "l":
				rv = tape.left();
				break;
			default:
				return {success: false, tape: tape, message:"Error processing instruction \"" + act.todo + "\".", select:act.source};
		}

		st = act.next;

		cb({last_action: act.todo, state: st, tape_state: tape, step: i});
	}

	return {success: true, message:"Run for " + i + " iterations."};
}