<<<<<<< HEAD
# Introducción a los Sistemas de Control 2025 - Scada Template

Proyecto de ejemplo para controlar un LED desde un SCADA web con Arduino, Node.js, Express y Socket.IO.
Incluye visualización en tiempo real del estado del LED y log de mensajes enviados por el Arduino.

---

## 📂 Estructura de directorios

```
scada-led/
├─ assets/                   # Recursos graficos para la documentación
│
├─ backend/                  # Código del servidor y comunicación con Arduino
│  ├─ server.mjs             # Servidor Express + Socket.IO
│  ├─ socket.mjs             # Lógica de comunicación con los clientes vía sockets
│  ├─ arduino.mjs            # Módulo para comunicarse con Arduino
│  ├─ package.json
│  └─ package-lock.json
│
├─ frontend/                 # Archivos del SCADA web
│  ├─ index.html             # Página principal del SCADA
│  └─ assets/
│     └─ style.css           # Estilos CSS del SCADA
│
├─ mcu/                      # Archivos del microcontrolador (MCU)
│  └─ builds/                # Binarios generados para la simulación
│  ├─ app03.sim1             # Proyecto SimulIDE
│  └─ app03.ino              # Código del MCU
│
└─ README.md                 # Documentación del proyecto
```

---

## ⚡ Funcionalidades

* Encender y apagar un LED conectado al Arduino desde el SCADA.
* Indicador visual tipo lamparita que refleja el estado real del LED.
* Log de mensajes enviados por el Arduino en tiempo real (`LED ENCENDIDO`, `LED APAGADO`, etc.).
* Backend modular y desacoplado para facilitar mantenimiento y escalabilidad.
* Desarrollo con **Nodemon** para reinicio automático del servidor al modificar archivos.

---

## 🚀 Comenzando

1. Instalar dependencias:

```bash
cd backend
npm install
```

2. Iniciar servidor en modo desarrollo:

```bash
npm run dev
```

3. Abrir en el navegador:

```
http://localhost:3000
```

4. Controlar el LED y ver los mensajes en tiempo real.

---

## 💡 Notas

* El backend valida la conexión con el Arduino y muestra un mensaje de error si no se puede conectar al puerto.
* La estructura permite agregar fácilmente más módulos de Arduino o funcionalidades del SCADA.
* En sistemas *nix la generación de puertos rs232 virtuales se realiza via socat:
  ```bash
    socat -d -d pty,raw,echo=0,link=/tmp/ttyV0 pty,raw,echo=0,link=/tmp/ttyV1
  ```
 

## Demostración de Simulación

![Simulación en SimulIDE](./assets/execution-demo.gif)


=======
# ScadaCamaraMQTT



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.tipyenaccion.net/isc/scadacamaramqtt.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://gitlab.tipyenaccion.net/isc/scadacamaramqtt/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> 16a4231c8619ece177aca38140583a73c18cffef
