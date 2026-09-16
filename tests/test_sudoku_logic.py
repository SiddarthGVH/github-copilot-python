import copy

import pytest

import sudoku_logic


def test_generate_puzzle_returns_two_9_by_9_boards():
    puzzle, solution = sudoku_logic.generate_puzzle()

    assert len(puzzle) == 9
    assert len(solution) == 9
    assert all(len(row) == 9 for row in puzzle)
    assert all(len(row) == 9 for row in solution)


def test_generated_solution_has_no_duplicate_values():
    _, solution = sudoku_logic.generate_puzzle()
    expected_values = set(range(1, 10))

    assert all(set(row) == expected_values for row in solution)
    assert all(
        {solution[row][column] for row in range(9)} == expected_values
        for column in range(9)
    )
    assert all(
        {
            solution[row][column]
            for row in range(box_row, box_row + 3)
            for column in range(box_column, box_column + 3)
        }
        == expected_values
        for box_row in range(0, 9, 3)
        for box_column in range(0, 9, 3)
    )


def test_puzzle_clues_match_solution():
    puzzle, solution = sudoku_logic.generate_puzzle()

    assert all(
        puzzle[row][column] == 0 or puzzle[row][column] == solution[row][column]
        for row in range(9)
        for column in range(9)
    )


@pytest.mark.parametrize('difficulty', ['easy', 'medium', 'hard'])
def test_generated_puzzle_has_one_solution(difficulty):
    puzzle, _ = sudoku_logic.generate_puzzle(difficulty)

    assert sudoku_logic.count_solutions(puzzle) == 1


def test_count_solutions_does_not_mutate_board():
    puzzle, _ = sudoku_logic.generate_puzzle('medium')
    original = copy.deepcopy(puzzle)

    sudoku_logic.count_solutions(puzzle)

    assert puzzle == original


def test_harder_difficulties_have_fewer_prefilled_clues():
    easy, _ = sudoku_logic.generate_puzzle('easy')
    medium, _ = sudoku_logic.generate_puzzle('medium')
    hard, _ = sudoku_logic.generate_puzzle('hard')

    count_clues = lambda board: sum(value != 0 for row in board for value in row)

    assert count_clues(easy) > count_clues(medium) > count_clues(hard)