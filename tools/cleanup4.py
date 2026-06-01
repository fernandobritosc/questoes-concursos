import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Re-add getQuestionValidation
text = text.replace(
    'useQuestoes,\n} from \'../hooks/useQuestoes\'',
    'useQuestoes,\n  getQuestionValidation,\n} from \'../hooks/useQuestoes\''
)

# Re-add PieChart
text = text.replace(
    'Pencil,\n  MoreVertical,',
    'Pencil,\n  PieChart,\n  MoreVertical,'
)

# Remove unused vars from destructuring
text = re.sub(r'^\s*setCadernoQuestoes,\s*\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*materiasUnicas,\s*\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*getFilteredQuestions,\s*\n', '', text, flags=re.MULTILINE)

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleanup 4 done")
