document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('gameBoard');
    const scoreDisplay = document.getElementById('score');
    const availableBlocksContainer = document.getElementById('availableBlocks');
    const restartButton = document.getElementById('restartButton');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreDisplay = document.getElementById('finalScore');
    const playAgainButton = document.getElementById('playAgainButton');

    const GRID_SIZE = 9;
    const CELL_SIZE = 40; // Sama dengan lebar/tinggi grid-cell di CSS
    let board = []; // Representasi 2D dari papan permainan
    let score = 0;
    let currentBlocks = []; // Blok yang tersedia untuk ditempatkan
    let draggedBlock = null;
    let draggedBlockData = null;
    let startDragOffset = { x: 0, y: 0 }; // Offset kursor dari sudut kiri atas blok
    let blockBeingDraggedElement = null; // Elemen blok yang sedang diseret (preview)

    // Definisi bentuk blok dan warna (mirip Block Blast)
    const BLOCK_SHAPES = [
        // Bentuk Lurus
        { shape: [[1, 1, 1, 1]], color: 1 }, // 1x4
        { shape: [[1], [1], [1], [1]], color: 1 }, // 4x1
        { shape: [[1, 1, 1]], color: 2 }, // 1x3
        { shape: [[1], [1], [1]], color: 2 }, // 3x1
        { shape: [[1, 1]], color: 3 }, // 1x2
        { shape: [[1], [1]], color: 3 }, // 2x1
        { shape: [[1]], color: 4 }, // 1x1

        // Bentuk Kotak
        { shape: [[1, 1], [1, 1]], color: 5 }, // 2x2
        { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 1 }, // 3x3

        // Bentuk L
        { shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: 2 },
        { shape: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: 2 },
        { shape: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: 2 },
        { shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: 2 },

        // Bentuk T
        { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 3 },
        { shape: [[1, 0, 0], [1, 1, 0], [1, 0, 0]], color: 3 },
        { shape: [[1, 1, 1], [0, 1, 0], [0, 0, 0]], color: 3 },
        { shape: [[0, 1, 0], [1, 1, 0], [0, 1, 0]], color: 3 },
    ];

    function initializeGame() {
        score = 0;
        scoreDisplay.textContent = score;
        board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0)); // 0 = kosong, 1-5 = terisi dengan warna
        drawBoard();
        currentBlocks = []; // Reset blok yang ada
        generateNewBlocks(); // Generate blok baru di awal
        gameOverMessage.style.display = 'none';
        restartButton.style.display = 'none';
    }

    function drawBoard() {
        gameBoard.innerHTML = '';
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                if (board[r][c] !== 0) {
                    cell.classList.add(`block-color-${board[r][c]}`);
                }
                gameBoard.appendChild(cell);
            }
        }
    }

    function generateNewBlocks() {
        // Hanya generate blok baru jika semua blok sebelumnya sudah ditempatkan (currentBlocks kosong atau semua null)
        if (currentBlocks.length === 0 || currentBlocks.every(block => block === null)) {
            currentBlocks = []; // Pastikan array kosong sebelum diisi ulang
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * BLOCK_SHAPES.length);
                currentBlocks.push(JSON.parse(JSON.stringify(BLOCK_SHAPES[randomIndex]))); // Deep copy
            }
        }
        renderAvailableBlocks();
        // checkGameOver(); // Panggil ini setelah blok dirender dan ada di papan
    }


    function renderAvailableBlocks() {
        availableBlocksContainer.innerHTML = '';
        currentBlocks.forEach((block, index) => {
            if (block) { // Pastikan blok masih ada
                const blockPreview = document.createElement('div');
                blockPreview.classList.add('block-preview');
                blockPreview.dataset.index = index;
                blockPreview.draggable = true; // Agar bisa di-drag

                const blockShapeDiv = document.createElement('div');
                blockShapeDiv.classList.add('block-shape');
                
                // Menentukan ukuran grid untuk pratinjau blok
                const maxDim = Math.max(block.shape.length, block.shape[0].length);
                blockShapeDiv.style.gridTemplateColumns = `repeat(${maxDim}, 20px)`;
                blockShapeDiv.style.gridTemplateRows = `repeat(${maxDim}, 20px)`;


                for (let r = 0; r < block.shape.length; r++) {
                    for (let c = 0; c < block.shape[r].length; c++) {
                        const blockUnit = document.createElement('div');
                        blockUnit.classList.add('block-unit');
                        if (block.shape[r][c] === 1) {
                            blockUnit.classList.add(`block-color-${block.color}`);
                        }
                        blockShapeDiv.appendChild(blockUnit);
                    }
                }
                blockPreview.appendChild(blockShapeDiv);
                availableBlocksContainer.appendChild(blockPreview);
            }
        });
    }

    function canPlaceBlock(block, startRow, startCol) {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c] === 1) {
                    const targetRow = startRow + r;
                    const targetCol = startCol + c;

                    if (targetRow >= GRID_SIZE || targetCol >= GRID_SIZE || targetRow < 0 || targetCol < 0 || board[targetRow][targetCol] !== 0) {
                        return false; // Di luar batas atau sel sudah terisi
                    }
                }
            }
        }
        return true;
    }

    function placeBlock(block, startRow, startCol) {
        if (!canPlaceBlock(block, startRow, startCol)) {
            return false;
        }

        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c] === 1) {
                    board[startRow + r][startCol + c] = block.color;
                }
            }
        }
        score += countBlockUnits(block) * 1; // Setiap unit blok memberikan 1 poin dasar
        drawBoard();
        clearLines();
        return true;
    }

    function countBlockUnits(block) {
        let count = 0;
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c] === 1) {
                    count++;
                }
            }
        }
        return count;
    }

    function clearLines() {
        let linesCleared = 0;

        // Cek baris
        for (let r = 0; r < GRID_SIZE; r++) {
            if (board[r].every(cell => cell !== 0)) {
                board[r].fill(0); // Kosongkan baris
                linesCleared++;
            }
        }

        // Cek kolom
        for (let c = 0; c < GRID_SIZE; c++) {
            let columnFull = true;
            for (let r = 0; r < GRID_SIZE; r++) {
                if (board[r][c] === 0) {
                    columnFull = false;
                    break;
                }
            }
            if (columnFull) {
                for (let r = 0; r < GRID_SIZE; r++) {
                    board[r][c] = 0; // Kosongkan kolom
                }
                linesCleared++;
            }
        }

        if (linesCleared > 0) {
            score += linesCleared * 10; // Poin bonus untuk setiap baris/kolom yang dibersihkan
            if (linesCleared > 1) {
                score += (linesCleared - 1) * 20; // Poin bonus ekstra untuk kombo
            }
            drawBoard();
        }
        scoreDisplay.textContent = score;
        // checkGameOver(); // Cek game over setelah membersihkan baris
    }

    function checkGameOver() {
        let anyBlockCanBePlaced = false;
        for (const block of currentBlocks) {
            if (!block) continue; // Skip blok yang sudah ditempatkan (null)
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (canPlaceBlock(block, r, c)) {
                        anyBlockCanBePlaced = true;
                        break;
                    }
                }
                if (anyBlockCanBePlaced) break;
            }
            if (anyBlockCanBePlaced) break;
        }

        if (!anyBlockCanBePlaced && currentBlocks.some(block => block !== null)) {
            // Jika ada blok yang tersisa tapi tidak bisa ditempatkan
            showGameOver();
        } else if (currentBlocks.every(block => block === null)) {
            // Jika semua blok sudah ditempatkan, generate yang baru dan cek game over lagi
            generateNewBlocks();
            // Panggil lagi checkGameOver untuk blok yang baru digenerate
            // Ini untuk kasus di mana blok baru yang digenerate pun tidak bisa ditempatkan
            if (!currentBlocks.some(block => {
                if (!block) return false;
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (canPlaceBlock(block, r, c)) {
                            return true;
                        }
                    }
                }
                return false;
            })) {
                showGameOver();
            }
        }
    }


    function showGameOver() {
        finalScoreDisplay.textContent = score;
        gameOverMessage.style.display = 'block';
        restartButton.style.display = 'block';
    }

    // --- Event Listeners untuk Drag and Drop ---
    availableBlocksContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('block-preview')) {
            const blockIndex = parseInt(e.target.dataset.index);
            draggedBlock = currentBlocks[blockIndex];
            draggedBlockData = { block: draggedBlock, index: blockIndex };

            // Buat elemen preview temporer yang mengikuti kursor
            blockBeingDraggedElement = e.target.cloneNode(true);
            blockBeingDraggedElement.style.position = 'absolute';
            blockBeingDraggedElement.style.opacity = '0.7';
            blockBeingDraggedElement.style.pointerEvents = 'none'; // Agar tidak mengganggu event mouse lainnya
            blockBeingDraggedElement.style.zIndex = '1000';
            document.body.appendChild(blockBeingDraggedElement);

            const rect = e.target.getBoundingClientRect();
            startDragOffset.x = e.clientX - rect.left;
            startDragOffset.y = e.clientY - rect.top;

            e.dataTransfer.setDragImage(new Image(), 0, 0); // Sembunyikan gambar drag default browser
        }
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault(); // Memungkinkan drop
        if (blockBeingDraggedElement) {
            // Update posisi elemen preview yang mengikuti kursor
            blockBeingDraggedElement.style.left = (e.clientX - startDragOffset.x) + 'px';
            blockBeingDraggedElement.style.top = (e.clientY - startDragOffset.y) + 'px';

            // Opsional: berikan highlight pada sel yang valid
            const targetCell = e.target.closest('.grid-cell');
            if (targetCell && draggedBlockData) {
                const row = parseInt(targetCell.dataset.row);
                const col = parseInt(targetCell.dataset.col);

                // Hapus highlight sebelumnya
                document.querySelectorAll('.grid-cell.highlight').forEach(cell => cell.classList.remove('highlight'));
                document.querySelectorAll('.grid-cell.invalid').forEach(cell => cell.classList.remove('invalid'));

                if (canPlaceBlock(draggedBlockData.block, row, col)) {
                    for (let r = 0; r < draggedBlockData.block.shape.length; r++) {
                        for (let c = 0; c < draggedBlockData.block.shape[r].length; c++) {
                            if (draggedBlockData.block.shape[r][c] === 1) {
                                const cellToHighlight = document.querySelector(`[data-row="${row + r}"][data-col="${col + c}"]`);
                                if (cellToHighlight) {
                                    cellToHighlight.classList.add('highlight');
                                }
                            }
                        }
                    }
                } else {
                     for (let r = 0; r < draggedBlockData.block.shape.length; r++) {
                        for (let c = 0; c < draggedBlockData.block.shape[r].length; c++) {
                            if (draggedBlockData.block.shape[r][c] === 1) {
                                const targetRow = row + r;
                                const targetCol = col + c;
                                if (targetRow < GRID_SIZE && targetCol < GRID_SIZE && targetRow >= 0 && targetCol >= 0) {
                                    const cellToHighlight = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
                                    if (cellToHighlight) {
                                        cellToHighlight.classList.add('invalid');
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    document.addEventListener('dragend', () => {
        if (blockBeingDraggedElement) {
            blockBeingDraggedElement.remove();
            blockBeingDraggedElement = null;
        }
        draggedBlock = null;
        draggedBlockData = null;
        // Hapus semua highlight saat drag berakhir
        document.querySelectorAll('.grid-cell.highlight').forEach(cell => cell.classList.remove('highlight'));
        document.querySelectorAll('.grid-cell.invalid').forEach(cell => cell.classList.remove('invalid'));
    });

    gameBoard.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedBlockData) {
            const targetCell = e.target.closest('.grid-cell');
            if (targetCell) {
                const row = parseInt(targetCell.dataset.row);
                const col = parseInt(targetCell.dataset.col);

                const success = placeBlock(draggedBlockData.block, row, col);

                if (success) {
                    currentBlocks[draggedBlockData.index] = null; // Hapus blok dari daftar yang tersedia
                    renderAvailableBlocks(); // Render ulang blok yang tersedia
                    checkGameOver(); // Cek game over setelah blok berhasil ditempatkan
                }
            }
        }
    });

    // Handle klik pada tombol "Main Lagi" atau "Mulai Ulang"
    playAgainButton.addEventListener('click', initializeGame);
    restartButton.addEventListener('click', initializeGame);


    // Inisialisasi game saat halaman dimuat
    initializeGame();
});
