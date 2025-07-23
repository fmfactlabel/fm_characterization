import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

def read_requirements(file):
    with open(file, "r") as fh:
        return fh.read().splitlines()

# Read development requirements from the dev-requirements.txt file
requirements = read_requirements("requirements.txt")

setuptools.setup(
    name="fact_label_json_gen",
    version="1.8.0",
    author="FM Fact Label",
    author_email="flamapy@us.es",
    description="FM Fact Lablel backend JSON generator",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/flamapy/core",
    packages=setuptools.find_namespace_packages(include=['*']),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.11',
    install_requires=requirements
)
