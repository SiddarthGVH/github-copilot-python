import random

from flask import Flask, jsonify, render_template, request, session
import sudoku_logic

app = Flask(__name__)
app.secret_key = 'dev-secret-key'  # Use an environment variable in production.


def _get_board(data):
    """Return a valid client board, or ``None`` when the request is malformed."""
    board = data.get('board') if isinstance(data, dict) else None
    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return None
    if any(
        not isinstance(row, list)
        or len(row) != sudoku_logic.SIZE
        or any(
            isinstance(value, bool)
            or not isinstance(value, int)
            or not 0 <= value <= sudoku_logic.SIZE
            for value in row
        )
        for row in board
    ):
        return None
    return board

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new', methods=['POST'])
def new_game():
    """Start a session-owned puzzle so users and tabs do not share game state."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Malformed request body'}), 400
    difficulty = data.get('difficulty', 'medium')
    if difficulty not in sudoku_logic.DIFFICULTY_CLUES:
        difficulty = 'medium'
    puzzle, solution = sudoku_logic.generate_puzzle(difficulty)
    session['puzzle'] = puzzle
    session['solution'] = solution
    locked = [[cell != sudoku_logic.EMPTY for cell in row] for row in puzzle]
    return jsonify({'puzzle': puzzle, 'locked': locked})

@app.route('/check', methods=['POST'])
def check_solution():
    """Compare filled client cells with the session solution without exposing it."""
    data = request.get_json(silent=True)
    board = _get_board(data)
    solution = session.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if board is None:
        return jsonify({'error': 'Malformed request body'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != sudoku_logic.EMPTY and board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    solved = not any(sudoku_logic.EMPTY in row for row in board) and not incorrect
    return jsonify({'incorrect': incorrect, 'solved': solved})


@app.route('/hint', methods=['POST'])
def hint():
    """Reveal one empty cell using the solution kept in the current session."""
    data = request.get_json(silent=True)
    board = _get_board(data)
    solution = session.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if board is None:
        return jsonify({'error': 'Malformed request body'}), 400
    empty_cells = [
        (row, col)
        for row in range(sudoku_logic.SIZE)
        for col in range(sudoku_logic.SIZE)
        if board[row][col] == sudoku_logic.EMPTY
    ]
    if not empty_cells:
        return jsonify({'error': 'No empty cells available'}), 400
    row, col = random.choice(empty_cells)
    return jsonify({'row': row, 'col': col, 'value': solution[row][col]})

if __name__ == '__main__':
    app.run(debug=True)
# DESIGN DECISION: The solution is deliberately kept server-side in the Flask
# session and never sent to the client. Copilot suggested caching it in
# localStorage for faster hints — rejected, because it would let any player read
# the full answer from DevTools.