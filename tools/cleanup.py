import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

unused_imports = [
    'CARREIRAS_DISPONIVEIS',
    'ESCOLARIDADES_DISPONIVEIS',
    'FORMACOES_DISPONIVEIS',
    'REGIOES_DISPONIVEIS',
    'FAVORITAS_OPCOES',
    'ENUNCIADOS_OPCOES',
]

for var in unused_imports:
    text = re.sub(r'\s*' + var + ',', '', text)

unused_icons = [
    'Folder,',
    'FolderOpen,',
]

for icon in unused_icons:
    text = re.sub(r'\s*' + icon, '', text)

unused_destructured = [
    'isCadernoActive', 'setIsCadernoActive', 'objetivo', 'setObjetivo', 'activeTab', 'setActiveTab', 
    'searchTerm', 'setSearchTerm', 'showSearchBox', 'setShowSearchBox', 'selectedMaterias', 
    'selectedAssuntos', 'setSelectedAssuntos', 'selectedBancas', 'selectedAnos', 'selectedOrgaos', 
    'selectedConcursos', 'selectedCarreiras', 'selectedEscolaridades', 'selectedFormacoes', 
    'selectedRegioes', 'selectedFavoritas', 'selectedEnunciados', 'selectedStatus', 'setSelectedStatus', 
    'isFilterExpanded', 'setIsFilterExpanded', 'visibleQuestionsCount', 'setVisibleQuestionsCount', 
    'expandedMateriaFolder', 'setExpandedMateriaFolder', 'cadernoNome', 'setCadernoNome', 
    'pastaDestino', 'setPastaDestino', 'gerarEmSerie', 'setGerarEmSerie', 'materiasComAssuntos', 
    'bancasUnicas', 'anosUnicos', 'orgaosUnicos', 'concursosUnicos', 'filteredCount', 
    'totalFiltrosAtivos', 'handleToggleMateria', 'handleToggleAssunto', 'handleToggleBanca', 
    'handleToggleAno', 'handleToggleOrgao', 'handleToggleConcurso', 'handleToggleCarreira', 
    'handleToggleEscolaridade', 'handleToggleFormacao', 'handleToggleRegiao', 'handleToggleFavorita', 
    'handleToggleEnunciado', 'handleResetFilters', 'handleGerarCaderno', 'getTabLabel', 
    'getFilteredMaterias', 'handleSelectQuestionFromList'
]

for var in unused_destructured:
    text = re.sub(r'^\s*' + var + ',\s*\n', '', text, flags=re.MULTILINE)

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleanup done")
