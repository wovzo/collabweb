with open("src/app/dashboard/creator/settings/page.tsx", "r") as f:
    content = f.read()

content = content.replace("Brand / Profile Name", "Creator / Profile Name")

with open("src/app/dashboard/creator/settings/page.tsx", "w") as f:
    f.write(content)
