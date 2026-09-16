import copy
import random

SIZE = 9
EMPTY = 0
DIFFICULTY_CLUES = {
    'easy': 40,
    'medium': 32,
    'hard': 26,
}


def deep_copy(board):
    """Copy a board so callers can preserve the original puzzle state."""
    return copy.deepcopy(board)


def create_empty_board():
    """Create the blank board used as the starting point for generation."""
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    """Determine whether placing a number preserves Sudoku constraints."""
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def find_empty(board):
    """Find the next blank cell that backtracking needs to fill."""
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None


def count_solutions(board, limit=2):
    """Count solutions without changing the board supplied by the caller.

    A uniqueness check is necessary because removing clues from a solved board
    can leave more than one valid completion, making the puzzle ambiguous.
    Counting stops at ``limit`` because generation only needs to distinguish
    unique puzzles from puzzles with multiple solutions.
    """
    if limit <= 0:
        return 0

    empty_cell = find_empty(board)
    if empty_cell is None:
        return 1

    row, col = empty_cell
    solutions = 0
    for candidate in range(1, SIZE + 1):
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            solutions += count_solutions(board, limit - solutions)
            board[row][col] = EMPTY
            if solutions >= limit:
                return solutions
    return solutions


def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def remove_cells(board, clues):
    """Remove clues while retaining one and only one valid solution.

    Checking each tentative removal is necessary because a random removal can
    make the puzzle ambiguous even when every remaining clue came from the
    original solved board.
    """
    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    remaining_clues = SIZE * SIZE

    for row, col in cells:
        if remaining_clues <= clues:
            break
        value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board, limit=2) == 1:
            remaining_clues -= 1
        else:
            board[row][col] = value


def generate_puzzle(difficulty='medium'):
    """Generate a puzzle whose difficulty target preserves a unique solution."""
    clues = DIFFICULTY_CLUES[difficulty]
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
