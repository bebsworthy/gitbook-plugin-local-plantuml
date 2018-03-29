# Plant UML IMG GitBook Plugin

This plugin builds on the [local-plantuml](https://plugins.gitbook.com/plugin/local-plantuml) plugin updated with changes from [local-plantuml-img](https://github.com/vboulaye/gitbook-plugin-local-plantuml-img)

It uses a local plantuml java call to generate the images.

## Block Embed

You can embed diagram using the block syntax.

```
{% plantuml %}
@startuml
    Alice -> Bob: Hello
    Alice <-- Bob: World
@enduml
{% endplantuml %}
```

It works for all type of graph supported by plantuml (AFAIK)

```
{% plantuml %}
@startsalt
{
  Login<&person> | "MyName   "
  Password<&key> | "****     "
  [Cancel <&circle-x>] | [OK <&account-login>]
}
@endsalt
{% endplantuml %}
```


## Image file

In addition to the standard block plugin call, the plugin processes the img whose src is a .puml file. 
This allows setting an alt/title attribute and using plugins such as [image-captions](https://github.com/todvora/gitbook-plugin-image-captions) for plantuml generated files.
This way you can also use a plugin to edit the plantuml file separately.

example, with a Markdown text:

```markdown
    [alt text](diagram.puml "title text")
```
    
The plugin will read the file diagram.puml relative to the .md page, transform it into svg (for html) or png (for ebooks) and replace the src attribute with the generated image location.

```html
    <img src='diagram.svg' alt="alt text' title='title text' />
```

Other improvements:

- Allow configuring temp planturl folder in books.json
- Remove markdown preprocessing of {% plantuml %}{% endplantuml %} blocks
 
 
# Release Notes
`1.0.0` Initial release with support of img tags.

# Issues
* Currently a new java process is started for every `plantuml` block in your markdown files. This can be a little slow.
