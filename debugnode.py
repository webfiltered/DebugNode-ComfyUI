"""A simple debug node used to quickly check output of nodes in ComfyUI"""

# AnyType was ruthlessly pilfered from https://github.com/pythongosssss/ComfyUI-Custom-Scripts
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY = AnyType("*")

class WTFDebugNode:
    """What's That Field?  Displays string representation of node output to ease debugging
    
    Displays some common attributes, if available:
    - len()
    - .shape
    - if the input was an iterable, the type of the first child item
    
    Displays str(Exception) on for unhandled exceptions"""

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "anything": (ANY,),
            }
        }

    OUTPUT_NODE = True

    INPUT_IS_LIST = True
    # OUTPUT_IS_LIST = (False,)
    RETURN_TYPES = ()
    FUNCTION = "execute"

    CATEGORY = "debug"

    def execute(self, anything=None):
        out = []
        
        for item in anything:
            info = {
                "type": str(type(item)),
            }

            try:
                info["len"] = len(item)
            except TypeError:
                pass
            except Exception as e:
                info["len"] = str(e)
                
            if not isinstance(item, str):
                try:
                    first_iter_item = next(iter(item))
                    info["firstIterItem"] = str(type(first_iter_item))
                except TypeError:
                    pass
                    # info["firstIterItem"] = ["Wasn't a list"]
                except StopIteration:
                    info["firstIterItem"] = "List had no items"
                except Exception as e:
                    info["firstIterItem"] = f"Exception [firstIterItem]: {str(e)}"

            try:
                info["shape"] = str(item.shape)
            except AttributeError:
                pass
            except Exception as e:
                info["shape"] = str(e)

            info["value"] = str(item) if item != None else None
            out.append(info)

        return { "ui": { "items": out, "length": [len(anything)] } }

NODE_CLASS_MAPPINGS = {
    "WTFDebugNode": WTFDebugNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WTFDebugNode": "🐜 WTF?",
}
