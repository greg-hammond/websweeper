"use strict";


/**
 * WebSweeper - an Ode to classic 'Minesweeper'
 * 
 * 
 * Author:  Greg Hammond
 *   Original development ~2015
 * 
 * Revision History: 
 *  - 10/11/2019 rewrote / re-implemented.  Created git repo.
 *   
 *
 * future work:
 *  - have smily face if win
 *  - need to get icons for 6/7/8
 *
 *  - RWD.  @media handling.
 *  - Move to Angular/TS
 *  - reimplement with canvas?
 *  - user select levels / mines / size
 *  - 'high scores'
 * 
 * 
 */

function Game() {

    // standard 'expert' is 16x30 grid with 99 mines

    let boardDefs = {
        cellSize: 22,
        rows: 16,
        cols: 30,
        mines: 99
    };

    let callbacks = {
        wonGame: wonGame,
        lostGame: lostGame,
        updateMines: updateMines
    };

    let board = new Board(boardDefs, callbacks);


    let
        elemStart = document.querySelector('.start'),
        elemMineCounter = document.querySelector('.mineCounter'),
        elemTimer = document.querySelector('.timer');

    var gameTimer = (function () {

        let OFF = -1,
            timer = OFF,

            updateDisplay = function (val) {
                elemTimer.innerHTML = val + '';
            };

        return {

            start: function () {
                if (timer === OFF) {
                    let startTime = Date.now();
                    timer = setInterval(function () {
                        updateDisplay(Math.round((Date.now() - startTime) / 1000));
                    }, 1000);
                }
            },
            stop: function () {
                if (timer != OFF) {
                    clearInterval(timer);
                    timer = OFF;
                }
            },
            reset: function () {
                updateDisplay(0);
            }
        }
    })(); // end gameTimer

    // prevent drag 
    document.addEventListener('dragstart', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    });

    // prevent context menu
    document.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    });

    elemStart.addEventListener('click', startGame);


    function startGame() {

        gameTimer.reset();
        elemStart.style.display = "none";
        board.reset();
        gameTimer.start();

    }

    function wonGame() {
        endGame();
    }

    function lostGame() {
        endGame();
    }


    function endGame() {
        gameTimer.stop();
        elemStart.style.display = "block";
        board.showAll();    // show the whole board
    }

    function updateMines(value) {
        elemMineCounter.innerHTML = value + '';
    }


};   // end game


/**
 *      Board and Cells() definitions
 */
function Board(defs, callbacks) {

    let grid = {
        ...defs,   // spread in "rows", "cols", "mines" that were passed in
        top: 0,
        left: 0,
        right: defs.cols - 1,
        bottom: defs.rows - 1,

        inBounds: function (r, c) {
            return r >= this.top && r <= this.bottom && c >= this.left & c <= this.right;
        }
    };


    let imgDefs = {
        '0': { file: 'imgs/clear.png' },
        '1': { file: 'imgs/one.png' },
        '2': { file: 'imgs/two.png' },
        '3': { file: 'imgs/three.png' },
        '4': { file: 'imgs/four.png' },
        '5': { file: 'imgs/five.png' },
        '6': { file: 'imgs/six.png' },
        '7': { file: 'imgs/seven.png' },
        '8': { file: 'imgs/eight.png' },
        'mine-ok': { file: 'imgs/mine-ok.png' },
        'mine-exploded': { file: 'imgs/mine-exploded.png' },
        'mine-wrong': { file: 'imgs/mine-wrong.png' },
        'UNMARKED': { file: 'imgs/unmarked.png' },
        'MARKED': { file: 'imgs/marked.png' },
        'MARKEDQ': { file: 'imgs/markq.png' }
    };

    for (let key in imgDefs) {
        let info = imgDefs[key];
        let img = new Image(grid.cellSize, grid.cellSize);
        img.src = info.file;
        imgDefs[key] = { ...info, image: img };
    }

    let markStates = [];
    markStates[markStates["UNMARKED"] = 0] = "UNMARKED";
    markStates[markStates["MARKED"] = 1] = "MARKED";
    markStates[markStates["MARKEDQ"] = 2] = "MARKEDQ";

    let markedCnt, markedMines, boardActive = false;


    // cell object
    function Cell(row, col) {

        this.row = row;
        this.col = col;
        this.id = [row, col].join('|');
        this.revealed = false;
        this.markState = markStates.UNMARKED;
        this.adjacentMines = 0;
        this.isMine = false;
        this.exploded = false;

        return this;
    }


    // user left-clicks a covered cell to reveal its value (or bomb => lose)
    // 
    Cell.prototype.reveal = function () {

        // can't reveal an already-revealed cell.
        if (this.revealed) { return; }

        // can't reveal a marked cell.
        if (this.markState !== markStates.UNMARKED) { return; }

        // reveal it
        this.revealed = true;

        if (this.isMine) {
            this.exploded = true;
        }

        updateIcon(this);

        // hit a mine - game over condition        
        if (this.isMine) {
            boardActive = false;  // turn off board
            callbacks.lostGame(); // game over!  call game's lose callback
            return;
        }

        // recursive field clearing - if we revealed a cell with no adjacent mines,
        // check all neighboring cells and clear in similar manner

        if (this.adjacentMines > 0) { return; }

        // clicked on blank cell - check surrounding cells
        for (let row = this.row - 1; row <= this.row + 1; row++) {
            for (let col = this.col - 1; col <= this.col + 1; col++) {

                // don't count self
                if (row === this.row && col === this.col) { continue; }

                // check surrounding cells - stay inside grid
                if (grid.inBounds(row, col)) {
                    Cells[row][col].reveal();   // recursive
                }
            }
        }
    }

    // selectively uncovering cells at end of game.
    // 
    Cell.prototype.show = function () {

        // show unmarked (and unexploded) mines
        if (this.isMine) {
            if (this.markState !== markStates.MARKED) {
                this.revealed = true;  // meh
                updateIcon(this);
            }

            // show incorrectly marked mines
        } else if (this.markState === markStates.MARKED) {
            this.revealed = true;  // meh
            updateIcon(this);
        }


    }

    // user right-clicked a cell to mark a mine.
    // this is a tri-state value: unmarked, marked, question
    // 
    Cell.prototype.mark = function () {

        // can't mark a revealed cell!
        if (this.revealed) { return; }

        let delta = 0;

        switch (this.markState) {

            case markStates.UNMARKED:
                // will move to MARKED.  increment marked counter
                delta = 1;
                break;
            case markStates.MARKED:
                // will move to MARKEDQ.  decrement marked counter
                delta = -1;
                break;
            case markStates.MARKEDQ:
                // will move to UNMARKED.  no change to marked counter
                delta = 0;
                break;
        }

        markedCnt += delta;
        if (this.isMine) {
            markedMines += delta;
        }

        // if markedCnt = markedMines, then all marked cells are correct.
        // if markedCnt > markedMines, then some cells are incorrectly marked as mines

        if (delta) {
            callbacks.updateMines(grid.mines - markedCnt);  // callback to game 
        }

        // now we can actually change the mark state and update the UI.
        this.markState = (this.markState + 1) % 3;
        updateIcon(this);

        // the game display must show how many are marked, and NOT how many are correct.
        // note that the player can mark more cells than there are mines.  this will
        // give a negative display value for 'mines remaining'.  This is actually OK.
        // If player later clears those marks, the count will come up to zero, and
        // then they'll win.  But they can't win *until* they get rid of the extra
        // marks - o/w they could just mark all cells and win...

        if (markedCnt === grid.mines && markedCnt === markedMines) {
            boardActive = false;  // turn off board
            callbacks.wonGame(); // won game!  call game's win callback            
        }

    }; // mark function


    // reset the cell to initial state
    Cell.prototype.reset = function () {
        this.revealed = false;
        this.markState = markStates.UNMARKED;
        this.adjacentMines = 0;
        this.isMine = false;
        this.exploded = false;
        updateIcon(this);
    };


    // one-time game initialization & setup - create Cells() and img elements

    const gridDiv = document.createElement('div');
    gridDiv.className = 'grid';


    let Cells = new Array(grid.rows);
    for (let row = 0; row < grid.rows; row++) {
        let colAry = new Array(grid.cols);
        for (let col = 0; col < grid.cols; col++) {

            let cell = new Cell(row, col);
            colAry[col] = cell;

            // create an img element for the cell too:
            let elem = document.createElement("img");
            elem.src = imgDefs['UNMARKED'].image.src;
            elem.className = "cell";
            elem.id = cell.id;
            elem.style.left = + (col * grid.cellSize - 1) + "px";
            elem.style.top = + (row * grid.cellSize - 1) + "px";
            elem.style.width = grid.cellSize + "px";
            elem.style.height = grid.cellSize + "px";

            elem.addEventListener('mousedown', (evt) => {
                if (boardActive) {
                    if (evt.button === 0) {
                        cell.reveal();  // left-click
                    } else if (evt.button === 2) {
                        cell.mark();    // right-click
                    }
                }
            });
            gridDiv.appendChild(elem);

        }
        Cells[row] = colAry;
    }

    gridDiv.style.width = grid.cols * grid.cellSize + "px",
        gridDiv.style.height = grid.rows * grid.cellSize + "px";
    document.querySelector('.wrapper').appendChild(gridDiv);




    // randomly set mines into the game grid
    // done at beginning of each game
    //
    function plantMines() {

        let mineCount = 0;
        let row, col, cell;

        while (mineCount < grid.mines) {

            row = Math.floor(Math.random() * (grid.rows));
            col = Math.floor(Math.random() * (grid.cols));

            cell = Cells[row][col];
            if (cell.isMine) { continue; };     // already have a mine here!
            cell.isMine = true;                 // make it a mine.
            mineCount++;

            // increment adjacent mine counts for cells surrounding the mine we just placed
            for (let row2 = row - 1; row2 <= row + 1; row2++) {
                for (let col2 = col - 1; col2 <= col + 1; col2++) {

                    // ignore self
                    if (row2 === row && col2 === col) { continue; }

                    if (grid.inBounds(row2, col2)) {
                        cell = Cells[row2][col2];
                        if (!cell.isMine) {
                            cell.adjacentMines++;
                        }
                    }
                }
            }
        } // while
    } // plantMines


    function updateIcon(cell) {
        let elem = document.getElementById(cell.id);
        let key;

        if (cell.revealed) {

            if (cell.isMine) {

                // these are end-of-game states - we're showing mines
                if (cell.exploded) {
                    // this is the one that got 'em!
                    key = 'mine-exploded';
                } else {
                    // show other mines they didn't find
                    key = 'mine-ok';
                }

            } else {

                if (cell.markState === markStates.MARKED) {
                    // reveal a cell that user incorrectly marked as mine
                    key = 'mine-wrong';

                } else {
                    // show a numbered cell
                    key = cell.adjacentMines + '';
                }
            }

        } else {
            key = markStates[cell.markState];
        }
        elem.src = imgDefs[key].image.src;

    }


    // return the board api
    return {

        reset: function () {
            // reset board state and plant new mines (start of each game)
            let cell;
            for (let row = 0; row < grid.rows; row++) {
                for (let col = 0; col < grid.cols; col++) {
                    cell = Cells[row][col];
                    cell.reset();
                }
            }
            plantMines();
            markedCnt = 0;
            markedMines = 0;
            callbacks.updateMines(grid.mines);
            boardActive = true;
        },

        showAll: function () {
            // reveal the entire board at end of game
            for (let row = 0; row < grid.rows; row++) {
                for (let col = 0; col < grid.cols; col++) {
                    Cells[row][col].show();
                }
            }
        }
    }
} // board definition

