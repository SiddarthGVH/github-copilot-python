def test_index_returns_success(client):
    response = client.get("/")

    assert response.status_code == 200


def test_new_returns_9_by_9_puzzle(client):
    response = client.post("/new", json={"difficulty": "easy"})
    data = response.get_json()

    assert response.status_code == 200
    assert "puzzle" in data
    assert "locked" in data
    assert isinstance(data["puzzle"], list)
    assert len(data["puzzle"]) == 9
    assert all(isinstance(row, list) and len(row) == 9 for row in data["puzzle"])
    assert all(
        locked == (value != 0)
        for puzzle_row, locked_row in zip(data["puzzle"], data["locked"])
        for value, locked in zip(puzzle_row, locked_row)
    )


def test_check_without_new_game_returns_error(client):
    response = client.post("/check", json={"board": []})

    assert response.status_code == 400
    assert response.get_json()["error"] == "No game in progress"


def test_check_reports_empty_cells_as_neither_incorrect_nor_solved(client):
    new_response = client.post("/new", json={"difficulty": "easy"})
    puzzle = new_response.get_json()["puzzle"]

    response = client.post("/check", json={"board": puzzle})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [], "solved": False}


def test_check_reports_incorrect_and_solved_board(client):
    client.post("/new", json={"difficulty": "easy"})
    with client.session_transaction() as stored:
        solution = stored["solution"]

    incorrect_board = [row[:] for row in solution]
    incorrect_board[0][0] = incorrect_board[0][0] % 9 + 1
    incorrect_response = client.post("/check", json={"board": incorrect_board})
    assert incorrect_response.get_json()["incorrect"] == [[0, 0]]
    assert incorrect_response.get_json()["solved"] is False

    solved_response = client.post("/check", json={"board": solution})
    assert solved_response.get_json() == {"incorrect": [], "solved": True}


def test_hint_returns_empty_cell_solution_value(client):
    new_response = client.post("/new", json={"difficulty": "easy"})
    puzzle = new_response.get_json()["puzzle"]

    response = client.post("/hint", json={"board": puzzle})
    data = response.get_json()

    assert response.status_code == 200
    assert puzzle[data["row"]][data["col"]] == 0
    with client.session_transaction() as stored:
        assert data["value"] == stored["solution"][data["row"]][data["col"]]